import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/companies/my-companies - Fetch all companies the current user has access to
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const userId = session.userId;

    // 1. Fetch current user with their base tenant
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        tenantId: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Collect tenant IDs:
    // a) Base tenant
    const accessibleTenantIds = new Set<string>([currentUser.tenantId]);

    // b) Direct memberships
    const memberships = await prisma.tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
    });
    memberships.forEach((m) => accessibleTenantIds.add(m.tenantId));

    // c) Auto-link sister companies registered with same verified phone or email (Owner convenience)
    if (currentUser.phone || currentUser.email) {
      const sisterAccounts = await prisma.user.findMany({
        where: {
          OR: [
            ...(currentUser.phone ? [{ phone: currentUser.phone }] : []),
            ...(currentUser.email ? [{ email: currentUser.email }] : []),
          ],
        },
        select: { tenantId: true },
      });
      sisterAccounts.forEach((acc) => accessibleTenantIds.add(acc.tenantId));
    }

    // 3. Fetch full details for all accessible tenants
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: Array.from(accessibleTenantIds) } },
      select: {
        id: true,
        businessName: true,
        legalName: true,
        gstin: true,
        slug: true,
        subscriptionTier: true,
        businessType: true,
      },
      orderBy: { businessName: "asc" },
    });

    const companies = tenants.map((t) => ({
      ...t,
      isCurrent: t.id === session.tenantId,
    }));

    return NextResponse.json({
      success: true,
      activeTenantId: session.tenantId,
      companies,
    });
  } catch (error: any) {
    console.error("Error fetching user companies:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch companies" }, { status: 500 });
  }
}
