export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch pending GSTR-2B reconciliations
    console.log("Running GSTR-2B sync check...");

    return NextResponse.json({ success: true, message: "GSTR-2B sync executed" });
  } catch (error: any) {
    console.error("GSTR-2B sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
