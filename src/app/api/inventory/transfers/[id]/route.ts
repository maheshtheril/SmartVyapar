import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { receiveStockTransfer, cancelStockTransfer } from "@/lib/warehouse-transfer";

interface Params {
  params: { id: string };
}

// PATCH /api/inventory/transfers/[id] - Mark transfer RECEIVED or CANCELLED
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const transferId = params.id;

    const body = await req.json();
    const { action, reason } = body;

    if (action === "RECEIVE") {
      const updated = await receiveStockTransfer(
        tenantId,
        session.userId,
        session.name,
        transferId
      );
      return NextResponse.json({
        success: true,
        message: "Stock transfer successfully received into destination warehouse",
        transfer: updated,
      });
    } else if (action === "CANCEL") {
      const updated = await cancelStockTransfer(
        tenantId,
        session.userId,
        session.name,
        transferId,
        reason || "Dispatch cancelled by operator"
      );
      return NextResponse.json({
        success: true,
        message: "Stock transfer cancelled and inventory restored to source warehouse",
        transfer: updated,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "RECEIVE" or "CANCEL".' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error updating transfer status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
