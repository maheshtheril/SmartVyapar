import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getProfitAndLoss } from "@/lib/accounting-reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("fromDate");
    const toStr = searchParams.get("toDate");

    const fromDate = fromStr ? new Date(fromStr) : undefined;
    const toDate = toStr ? new Date(toStr) : undefined;

    const report = await getProfitAndLoss(tenantId, { fromDate, toDate });

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
    console.error("Error generating profit and loss:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
