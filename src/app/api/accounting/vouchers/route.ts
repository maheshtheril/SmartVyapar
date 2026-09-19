import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createVoucherTransaction, getVouchers } from "@/lib/accounting-voucher";
import { VoucherType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/accounting/vouchers - List vouchers (OWNER / MANAGER only)
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const voucherType = searchParams.get("type") as VoucherType | null;
    const search = searchParams.get("search") || undefined;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const { total, vouchers } = await getVouchers(tenantId, {
      voucherType: voucherType && voucherType in VoucherType ? voucherType : undefined,
      search,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      total,
      vouchers,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Voucher list error:", error);
    return NextResponse.json({ error: "Failed to fetch vouchers" }, { status: 500 });
  }
}

// POST /api/accounting/vouchers - Record new double-entry voucher
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();

    const voucher = await createVoucherTransaction(tenantId, body, {
      id: session.userId,
      name: session.name,
    });

    return NextResponse.json({
      success: true,
      message: `Voucher ${voucher.voucherNumber} recorded successfully!`,
      voucher,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.name === "ZodError") {
      const issue = error.issues?.[0];
      return NextResponse.json(
        { error: issue ? issue.message : "Validation failed" },
        { status: 400 }
      );
    }
    console.error("Voucher creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record accounting voucher" },
      { status: 400 }
    );
  }
}
