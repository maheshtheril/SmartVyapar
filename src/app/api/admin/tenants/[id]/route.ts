import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── Platform-level protection ────────────────────────────────────────────
    const session = await getSessionFromRequest(req);
    const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL;

    if (!platformAdminEmail) {
      return NextResponse.json(
        { success: false, error: "PLATFORM_ADMIN_EMAIL not configured" },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const requestingUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true },
    });

    if (!requestingUser || requestingUser.email !== platformAdminEmail) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Platform admin access only" },
        { status: 403 }
      );
    }

    // ── Validate target tenant ───────────────────────────────────────────────
    const { id: tenantId } = params;

    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        businessName: true,
        subscriptionTier: true,
        planExpiresAt: true,
      },
    });

    if (!existingTenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    // ── Parse & validate body ────────────────────────────────────────────────
    const body = await req.json();
    const { subscriptionTier, planExpiresAt } = body as {
      subscriptionTier?: "PRO" | "FREE";
      planExpiresAt?: string | null;
    };

    if (subscriptionTier && !["PRO", "FREE"].includes(subscriptionTier)) {
      return NextResponse.json(
        { success: false, error: "Invalid subscriptionTier. Must be PRO or FREE." },
        { status: 400 }
      );
    }

    // ── Build update payload ─────────────────────────────────────────────────
    const updateData: Record<string, unknown> = {};

    if (subscriptionTier !== undefined) {
      updateData.subscriptionTier = subscriptionTier;
      // When upgrading to PRO, set status to ACTIVE; when downgrading, keep existing
      if (subscriptionTier === "PRO") {
        updateData.subscriptionStatus = "ACTIVE";
      } else if (subscriptionTier === "FREE") {
        updateData.subscriptionStatus = "ACTIVE";
        updateData.planExpiresAt = null;
      }
    }

    if (planExpiresAt !== undefined) {
      updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
    }

    // ── Perform the update ───────────────────────────────────────────────────
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true,
        businessName: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    });

    // ── Write audit log ──────────────────────────────────────────────────────
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: requestingUser.name ?? "Platform Admin",
      action: "UPDATE",
      entityType: "TENANT",
      entityId: tenantId,
      details: {
        event: "MANUAL_PLAN_CHANGE",
        performedBy: requestingUser.email,
        previousTier: existingTenant.subscriptionTier,
        newTier: updatedTenant.subscriptionTier,
        previousExpiry: existingTenant.planExpiresAt,
        newExpiry: updatedTenant.planExpiresAt,
        businessName: existingTenant.businessName,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("[ADMIN TENANT PATCH]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
