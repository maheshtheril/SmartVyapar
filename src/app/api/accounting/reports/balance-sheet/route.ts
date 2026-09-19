import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getBalanceSheet } from "@/lib/accounting-reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const asOfStr = searchParams.get("asOfDate");
    const asOfDate = asOfStr ? new Date(asOfStr) : undefined;

    const report = await getBalanceSheet(tenantId, { asOfDate });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error generating balance sheet:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
