import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError, ForbiddenError } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { AuditAction, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/users - List all staff & users for the tenant (OWNER & MANAGER)
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - Add a new team member with specific role & permissions (OWNER only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { name, email, phone, password, role = "STAFF" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Staff member name is required" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const validRoles = [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    // Check email uniqueness if email provided
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const existing = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existing) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        tenantId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        passwordHash,
        role: role as UserRole,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Record statutory audit trail
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.CREATE,
      entityType: "USER_INVITE",
      entityId: newUser.id,
      details: {
        newUserName: newUser.name,
        newUserRole: newUser.role,
        newUserEmail: newUser.email,
        assignedBy: session.name,
      },
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `User ${newUser.name} created successfully as ${newUser.role}`,
    }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
