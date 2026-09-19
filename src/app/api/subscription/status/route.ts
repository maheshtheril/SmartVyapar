import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getTenantSubscriptionDetails } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const subscription = await getTenantSubscriptionDetails(session.tenantId);

    return NextResponse.json({
      success: true,
      subscription,
      userRole: session.role,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[SubscriptionStatus] Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to load subscription details." },
      { status: 500 }
    );
  }
}
