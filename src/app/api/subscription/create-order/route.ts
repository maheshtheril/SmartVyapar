import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { createRazorpayOrder } from "@/lib/razorpay";
import { SubscriptionTier } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    requireRole(req, ["OWNER"]); // Strict: Only the Business Owner can initiate billing payments

    const body = await req.json().catch(() => ({}));
    const cycle: "MONTHLY" | "ANNUAL" = body.cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";
    const tier: SubscriptionTier = (body.tier as SubscriptionTier) || "PRO";

    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) {
      return NextResponse.json({ error: "Invalid subscription tier requested." }, { status: 400 });
    }

    const amountPaise = cycle === "ANNUAL" ? plan.annualPaise : plan.monthlyPaise;

    if (amountPaise <= 0) {
      return NextResponse.json({ error: "Free plan does not require checkout." }, { status: 400 });
    }

    const receipt = `rcpt_${session.tenantSlug.substring(0, 8)}_${Date.now()}`;

    const order = await createRazorpayOrder({
      amountPaise,
      currency: "INR",
      receipt,
      notes: {
        tenantId: session.tenantId,
        tenantSlug: session.tenantSlug,
        tier,
        cycle,
      },
    });

    return NextResponse.json({
      success: true,
      order,
      plan: {
        name: plan.name,
        cycle,
        amount: amountPaise / 100,
      },
      business: {
        name: session.name,
        tenantSlug: session.tenantSlug,
      },
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json(
        { error: "Forbidden: Only the business owner can manage subscriptions and billing." },
        { status: 403 }
      );
    }
    console.error("[CreateSubscriptionOrder] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate payment." },
      { status: 500 }
    );
  }
}
