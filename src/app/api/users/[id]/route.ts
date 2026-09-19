import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { AuditAction, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

// PATCH /api/users/[id] - Update user role or toggle active/disabled status (OWNER only)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(req, ["OWNER"]);
    const tenantId = session.tenantId;
    const targetUserId = params.id;

    const body = await req.json();
    const { role, isActive } = body;

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safety: Cannot deactivate your own logged-in account
    if (targetUserId === session.userId && isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own owner account" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(role && Object.values(UserRole).includes(role) ? { role: role as UserRole } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    // Record statutory audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.UPDATE,
      entityType: "USER_PERMISSION",
      entityId: targetUserId,
      details: {
        targetName: updated.name,
        targetEmail: updated.email,
        updatedRole: role,
        updatedStatus: isActive !== undefined ? (isActive ? "ACTIVE" : "INACTIVE") : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: "User updated successfully",
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Remove user (OWNER only)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(req, ["OWNER"]);
    const tenantId = session.tenantId;
    const targetUserId = params.id;

    if (targetUserId === session.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.DELETE,
      entityType: "USER_DELETED",
      entityId: targetUserId,
      details: {
        deletedUserName: targetUser.name,
        deletedUserEmail: targetUser.email,
        deletedUserRole: targetUser.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.name} removed successfully`,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
