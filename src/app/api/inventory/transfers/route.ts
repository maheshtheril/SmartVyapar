export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { CreateStockTransferSchema } from "@/lib/schemas/warehouse";
import { dispatchStockTransfer } from "@/lib/warehouse-transfer";

// GET /api/inventory/transfers - List stock transfers
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = { tenantId };
    if (status && status !== "ALL") {
      where.status = status;
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      transfers,
    });
  } catch (error: any) {
    console.error("Error listing transfers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/inventory/transfers - Create and dispatch stock transfer
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const validation = validateBody(CreateStockTransferSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const transfer = await dispatchStockTransfer(
      tenantId,
      session.userId,
      session.name,
      validation.data
    );

    return NextResponse.json({
      success: true,
      message: "Stock transfer dispatched successfully",
      transfer,
    });
  } catch (error: any) {
    console.error("Error creating transfer:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
