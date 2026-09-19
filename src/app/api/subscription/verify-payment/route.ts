import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { recordAuditLog } from "@/lib/audit";
import { SubscriptionTier } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    requireRole(req, ["OWNER"]); // Owner only

    const body = await req.json().catch(() => ({}));
    const { orderId, paymentId, signature, cycle = "MONTHLY", tier = "PRO" } = body;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters." },
        { status: 400 }
      );
    }

    const isValidSignature = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Payment signature verification failed. Untrusted payload." },
        { status: 400 }
      );
    }

    const targetTier = tier as SubscriptionTier;
    const plan = SUBSCRIPTION_PLANS[targetTier] || SUBSCRIPTION_PLANS.PRO;
    const isAnnual = cycle === "ANNUAL";
    const durationDays = isAnnual ? 365 : 30;
    const amount = isAnnual ? plan.annualPrice : plan.monthlyPrice;

    // Execute atomic subscription update
    const result = await prisma.$transaction(async (tx) => {
      const currentTenant = await tx.tenant.findUnique({
        where: { id: session.tenantId },
        select: { planExpiresAt: true, subscriptionTier: true },
      });

      const now = new Date();
      let baseDate = now;
      if (
        currentTenant?.planExpiresAt &&
        currentTenant.planExpiresAt > now &&
        currentTenant.subscriptionTier === targetTier
      ) {
        // Stack on top of remaining days
        baseDate = currentTenant.planExpiresAt;
      }

      const newExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // Update tenant subscription status
      const updatedTenant = await tx.tenant.update({
        where: { id: session.tenantId },
        data: {
          subscriptionTier: targetTier,
          subscriptionStatus: "ACTIVE",
          planBillingCycle: cycle,
          planExpiresAt: newExpiresAt,
        },
      });

      // Record immutable payment record
      const paymentRecord = await tx.subscriptionPayment.create({
        data: {
          tenantId: session.tenantId,
          orderId,
          paymentId,
          signature,
          amount,
          currency: "INR",
          tier: targetTier,
          billingCycle: cycle,
          status: "PAID",
        },
      });

      return { updatedTenant, paymentRecord, newExpiresAt };
    });

    // Record statutory audit log
    try {
      await recordAuditLog({
        tenantId: session.tenantId,
        userId: session.userId,
        userName: session.name,
        entityType: "TENANT",
        entityId: session.tenantId,
        action: "UPDATE",
        details: {
          event: "SUBSCRIPTION_UPGRADED",
          tier: targetTier,
          billingCycle: cycle,
          amount,
          orderId,
          paymentId,
          expiresAt: result.newExpiresAt.toISOString(),
        },
      });
    } catch (err) {
      console.error("[AuditLog] Failed recording subscription upgrade:", err);
    }

    return NextResponse.json({
      success: true,
      message: `Congratulations! Your business is now upgraded to ${plan.name}.`,
      tier: targetTier,
      billingCycle: cycle,
      expiresAt: result.newExpiresAt,
      paymentId: result.paymentRecord.id,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden: Owner only." }, { status: 403 });
    }
    console.error("[VerifySubscriptionPayment] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete subscription upgrade." },
      { status: 500 }
    );
  }
}
