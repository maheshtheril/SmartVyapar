export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete audit logs older than 1 year to save space
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: oneYearAgo }
      }
    });

    console.log(`Cleaned up ${deletedLogs.count} old audit logs.`);

    return NextResponse.json({ success: true, message: "Session cleanup executed", processed: deletedLogs.count });
  } catch (error: any) {
    console.error("Session cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
