import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { StockLogType, AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/inventory/adjust
 * Adjusts product stock for physical inventory count reconciliation,
 * damages, expiry, shrinkage, or stocktake variances.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { productId, type, quantity, reason, notes } = body;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number greater than 0" }, { status: 400 });
    }

    if (!["ADD", "DEDUCT", "SET_EXACT"].includes(type)) {
      return NextResponse.json({ error: "Invalid adjustment type. Must be ADD, DEDUCT, or SET_EXACT" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, tenantId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentStockNum = Number(product.currentStock);
    let changeQty = 0;
    let newStock = currentStockNum;

    if (type === "ADD") {
      changeQty = qty;
      newStock = currentStockNum + qty;
    } else if (type === "DEDUCT") {
      changeQty = -qty;
      newStock = Math.max(0, currentStockNum - qty);
    } else if (type === "SET_EXACT") {
      changeQty = qty - currentStockNum;
      newStock = qty;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update product current stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      // 2. Record immutable StockLog
      const stockLog = await tx.stockLog.create({
        data: {
          tenantId,
          productId,
          changeQty,
          type: StockLogType.MANUAL_ADJUSTMENT,
          note: `Stock Adjustment (${reason || "Physical Audit"}): ${changeQty > 0 ? "+" : ""}${changeQty} ${product.baseUnit}. Previous: ${currentStockNum}, New: ${newStock}${notes ? ` - ${notes}` : ""}`,
        },
      });

      // 3. Record MCA / GST Audit Trail
      await recordAuditLog(
        {
          tenantId,
          userId: session.userId,
          userName: session.name,
          action: AuditAction.STOCK_ADJUSTMENT,
          entityType: "STOCK",
          entityId: productId,
          details: {
            productName: product.name,
            previousStock: currentStockNum,
            changeQty,
            newStock,
            reason,
            notes,
          },
        },
        tx
      );

      return { updatedProduct, stockLog };
    });

    return NextResponse.json({
      success: true,
      product: result.updatedProduct,
      changeQty,
      previousStock: currentStockNum,
      newStock,
    });
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
