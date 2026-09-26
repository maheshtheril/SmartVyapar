export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Flag expired subscriptions
    const now = new Date();
    const updated = await prisma.tenant.updateMany({
      where: {
        subscriptionStatus: "ACTIVE",
        planExpiresAt: { lt: now }
      },
      data: {
        subscriptionStatus: "EXPIRED"
      }
    });

    console.log(`Expired ${updated.count} subscriptions.`);

    return NextResponse.json({ success: true, message: "Subscription renewal executed", processed: updated.count });
  } catch (error: any) {
    console.error("Subscription renewal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
