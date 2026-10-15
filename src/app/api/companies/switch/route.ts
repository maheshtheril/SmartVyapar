import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, signToken, buildSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/companies/switch - Switch the active company workspace (Zoho / SAP Switcher)
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const userId = session.userId;

    const body = await req.json();
    const { tenantId: targetTenantId } = body;

    if (!targetTenantId) {
      return NextResponse.json({ error: "targetTenantId is required" }, { status: 400 });
    }

    // 1. Fetch current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch target tenant
    const targetTenant = await prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });

    if (!targetTenant) {
      return NextResponse.json({ error: "Target company not found" }, { status: 404 });
    }

    // 3. Verify user has access to this target tenant
    let targetRole = currentUser.role;
    let targetUserId = currentUser.id;

    // Direct match (already in this company)
    if (currentUser.tenantId === targetTenantId) {
      targetRole = currentUser.role;
    } else {
      // Check TenantMembership
      const membership = await prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId: currentUser.id,
            tenantId: targetTenantId,
          },
        },
      });

      if (membership) {
        targetRole = membership.role;
      } else {
        // Check if user has an account in the target company with matching phone or email
        const targetAccount = await prisma.user.findFirst({
          where: {
            tenantId: targetTenantId,
            OR: [
              ...(currentUser.phone ? [{ phone: currentUser.phone }] : []),
              ...(currentUser.email ? [{ email: currentUser.email }] : []),
            ],
          },
        });

        if (targetAccount) {
          targetRole = targetAccount.role;
          targetUserId = targetAccount.id;
        } else if (currentUser.role === "OWNER") {
          // If the user is an owner, automatically create a membership link
          await prisma.tenantMembership.create({
            data: {
              userId: currentUser.id,
              tenantId: targetTenantId,
              role: "OWNER",
            },
          });
          targetRole = "OWNER";
        } else {
          return NextResponse.json(
            { error: "You do not have permission to access this company" },
            { status: 403 }
          );
        }
      }
    }

    // 4. Issue new JWT token with the new company's context
    const token = await signToken({
      userId: targetUserId,
      tenantId: targetTenant.id,
      tenantSlug: targetTenant.slug,
      name: currentUser.name,
      role: targetRole,
    });

    const response = NextResponse.json({
      success: true,
      message: `Switched active company to ${targetTenant.businessName}`,
      targetTenant: {
        id: targetTenant.id,
        businessName: targetTenant.businessName,
        legalName: targetTenant.legalName,
        slug: targetTenant.slug,
        role: targetRole,
      },
    });

    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (error: any) {
    console.error("Error switching company:", error);
    return NextResponse.json({ error: error.message || "Failed to switch company" }, { status: 500 });
  }
}
