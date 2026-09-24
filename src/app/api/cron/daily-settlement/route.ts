import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Auto-close shifts that have been open for > 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find open cash drawers older than 24 hours
    const staleDrawers = await prisma.cashDrawerShift.findMany({
      where: {
        status: "OPEN",
        openedAt: { lt: yesterday }
      }
    });

    // In a real implementation, we would summarize their sales and close them.
    // For now, we'll just log them.
    console.log(`Found ${staleDrawers.length} stale cash drawers to auto-close.`);

    return NextResponse.json({ success: true, message: "Daily settlement executed", processed: staleDrawers.length });
  } catch (error: any) {
    console.error("Daily settlement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
