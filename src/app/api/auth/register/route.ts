import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { validateBody } from "@/lib/validation";
import {
  RegisterTenantSchema,
  slugify,
  getStateFromGstin,
} from "@/lib/schemas/register";
import { signToken, buildSessionCookie } from "@/lib/auth";
import { getIndianFinancialYear } from "@/lib/invoice-sequence";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limiter";

// POST /api/auth/register - Self-serve merchant registration
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown-ip";
    
    // Rate limit: 3 registrations per hour per IP to prevent abuse
    const rateLimit = checkRateLimit(`register-ip:${ip}`, 3, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetInSeconds) } }
      );
    }

    const body = await req.json();
    const validation = validateBody(RegisterTenantSchema, body);
    if (!validation.success) {
      return validation.response;
    }
    const data = validation.data;

    // Check if an account with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // Generate unique tenant slug
    const baseSlug = slugify(data.businessName) || "store";
    let slug = baseSlug;
    let collisionCount = 0;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${baseSlug}-${suffix}`;
      collisionCount++;
      if (collisionCount > 10) break;
    }

    // Auto-detect State Code from GSTIN if present
    let stateCode = data.stateCode;
    let stateName = data.stateName;
    if (data.gstin) {
      const detected = getStateFromGstin(data.gstin);
      if (detected) {
        stateCode = detected.stateCode;
        stateName = detected.stateName;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);
    const fy = getIndianFinancialYear();

    // Atomic transaction: Create Tenant, Owner User, and Initial Invoice Sequence
    const { tenant, user } = await prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          slug,
          businessName: data.businessName,
          legalName: data.businessName,
          gstin: data.gstin || null,
          stateCode,
          stateName,
          upiId: data.upiId,
          phone: data.phone,
          email: data.email,
          address: data.address || null,
          isComposition: data.isComposition,
          subscriptionTier: "FREE",
        },
      });

      const createdUser = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          name: data.ownerName,
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: "OWNER",
          isActive: true,
        },
      });

      // Initialize default invoice sequence
      await tx.invoiceSequence.create({
        data: {
          tenantId: createdTenant.id,
          financialYear: fy.full,
          prefix: "INV",
          lastNumber: 0,
        },
      });

      // Seed the default Chart of Accounts for the new tenant
      const { seedDefaultAccounts } = await import("@/lib/default-accounts");
      await seedDefaultAccounts(tx, createdTenant.id);

      return { tenant: createdTenant, user: createdUser };
    }, DEFAULT_TX_OPTIONS);

    // Generate authenticated JWT session
    const token = await signToken({
      userId: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: {
          name: user.name,
          role: user.role,
          tenantSlug: tenant.slug,
          businessName: tenant.businessName,
        },
      },
      { status: 201 }
    );

    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete registration" },
      { status: 500 }
    );
  }
}
