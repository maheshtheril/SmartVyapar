import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

const PRO_MONTHLY_PRICE = 499;

export async function GET(req: NextRequest) {
  try {
    // Platform-level protection: only the SaaS owner can access this
    const session = await getSessionFromRequest(req);
    const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL;

    if (!platformAdminEmail) {
      return NextResponse.json(
        { success: false, error: "PLATFORM_ADMIN_EMAIL not configured" },
        { status: 500 }
      );
    }

    // Check via session email stored in JWT, or fall back to checking the DB user
    // The session has userId — we'll fetch user email from DB for the check
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const requestingUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    if (!requestingUser || requestingUser.email !== platformAdminEmail) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Platform admin access only" },
        { status: 403 }
      );
    }

    // ── Fetch all tenants with aggregated stats ──────────────────────────────
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        businessName: true,
        email: true,
        phone: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        planExpiresAt: true,
        createdAt: true,
        _count: {
          select: {
            invoices: true,
            products: true,
            purchaseBills: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        subscriptionPayments: {
          orderBy: { createdAt: "desc" },
          select: {
            amount: true,
            status: true,
            createdAt: true,
            billingCycle: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── All subscription payments for the revenue log panel ─────────────────
    const allPayments = await prisma.subscriptionPayment.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tenantId: true,
        amount: true,
        status: true,
        tier: true,
        billingCycle: true,
        orderId: true,
        paymentId: true,
        createdAt: true,
        tenant: {
          select: { businessName: true },
        },
      },
    });

    // ── Revenue & expiry metrics ─────────────────────────────────────────────
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const proTenants = tenants.filter(
      (t) => t.subscriptionTier === "PRO" && t.subscriptionStatus === "ACTIVE"
    );
    const freeTenants = tenants.filter((t) => t.subscriptionTier === "FREE");
    const expiringSoon = tenants.filter(
      (t) =>
        t.planExpiresAt &&
        t.planExpiresAt > now &&
        t.planExpiresAt <= sevenDaysLater
    );

    const mrr = proTenants.length * PRO_MONTHLY_PRICE;
    const arr = mrr * 12;
    const totalRevenue = allPayments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);

    // ── Shape the tenants response ───────────────────────────────────────────
    const tenantsResponse = tenants.map((t) => ({
      id: t.id,
      businessName: t.businessName,
      email: t.email,
      phone: t.phone,
      subscriptionTier: t.subscriptionTier,
      subscriptionStatus: t.subscriptionStatus,
      planExpiresAt: t.planExpiresAt,
      createdAt: t.createdAt,
      invoiceCount: t._count.invoices,
      productCount: t._count.products,
      purchaseBillCount: t._count.purchaseBills,
      lastActiveAt: t.auditLogs[0]?.createdAt ?? null,
      payments: t.subscriptionPayments.map((p) => ({
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        billingCycle: p.billingCycle,
      })),
    }));

    // ── Shape the payments response ──────────────────────────────────────────
    const paymentsResponse = allPayments.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      businessName: p.tenant.businessName,
      amount: p.amount,
      status: p.status,
      tier: p.tier,
      billingCycle: p.billingCycle,
      orderId: p.orderId,
      paymentId: p.paymentId,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      metrics: {
        totalTenants: tenants.length,
        proTenants: proTenants.length,
        freeTenants: freeTenants.length,
        mrr,
        arr,
        totalRevenue,
        expiringSoon: expiringSoon.length,
      },
      tenants: tenantsResponse,
      payments: paymentsResponse,
    });
  } catch (error) {
    console.error("[ADMIN TENANTS GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
