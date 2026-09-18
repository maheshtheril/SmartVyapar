import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, buildSessionCookie, clearSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/auth/login  — Login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Look up user (email is unique across all tenants)
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Sign JWT with tenant context
    const token = await signToken({
      userId: user.id,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        name: user.name,
        role: user.role,
        tenantSlug: user.tenant.slug,
        businessName: user.tenant.businessName,
      },
    });

    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/auth/login  — Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
