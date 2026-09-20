import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/inventory/stock-history?productId=...
 * Fetches the complete immutable stock ledger history for a product.
 * Returns running balance and categorized totals:
 * - Opening stock
 * - Purchases (+)
 * - Sales Returns (+)
 * - Sales (-)
 * - Purchase Returns (-)
 * - Adjustments (+/-)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, tenantId },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        baseUnit: true,
        currentStock: true,
        purchasePrice: true,
        sellingPrice: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const logs = await prisma.stockLog.findMany({
      where: { productId, tenantId },
      orderBy: { createdAt: "asc" },
    });

    let runningBalance = 0;
    let totalPurchases = 0;
    let totalSalesReturns = 0;
    let totalSales = 0;
    let totalPurchaseReturns = 0;
    let totalAdjustments = 0;
    let openingStock = 0;

    const timeline = logs.map((log) => {
      const change = Number(log.changeQty);
      runningBalance += change;

      if (log.type === "INITIAL") {
        openingStock += change;
      } else if (log.type === "PURCHASE_IN") {
        totalPurchases += change;
      } else if (log.type === "RETURN_IN") {
        totalSalesReturns += change;
      } else if (log.type === "SALE_OUT" || log.type === "CONSUMPTION_OUT") {
        totalSales += Math.abs(change);
      } else if (log.note && log.note.includes("Purchase Return")) {
        totalPurchaseReturns += Math.abs(change);
      } else {
        totalAdjustments += change;
      }

      return {
        id: log.id,
        date: log.createdAt,
        type: log.type,
        changeQty: change,
        runningBalance,
        referenceId: log.referenceId,
        note: log.note,
      };
    });

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        currentStock: Number(product.currentStock),
      },
      summary: {
        openingStock,
        totalPurchases,
        totalSalesReturns,
        totalSales,
        totalPurchaseReturns,
        totalAdjustments,
        computedBalance: runningBalance,
        liveStock: Number(product.currentStock),
        isAccurate: Math.abs(runningBalance - Number(product.currentStock)) <= 0.001,
      },
      timeline: timeline.reverse(), // Most recent first for UI
    });
  } catch (error: any) {
    console.error("Error fetching stock history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
