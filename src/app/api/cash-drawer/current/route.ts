import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/cash-drawer/current
 * Returns the currently open cash drawer shift and live sales metrics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const activeShift = await prisma.cashDrawerShift.findFirst({
      where: {
        tenantId,
        status: "OPEN",
      },
      include: {
        payouts: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { openedAt: "desc" },
    });

    if (!activeShift) {
      return NextResponse.json({
        success: true,
        shift: null,
        message: "No active shift open",
      });
    }

    // Query invoices created since shift was opened
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: activeShift.openedAt },
      },
      select: {
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        paymentMode: true,
        paymentStatus: true,
      },
    });

    let liveCashSales = 0;
    let liveUpiSales = 0;
    let liveCardSales = 0;
    let liveCreditSales = 0;
    let grossSales = 0;

    for (const inv of invoices) {
      const paid = Number(inv.paidAmount || 0);
      const total = Number(inv.totalAmount || 0);
      const due = Number(inv.dueAmount || 0);
      grossSales += total;

      if (due > 0) {
        liveCreditSales += due;
      }

      if (inv.paymentMode === "CASH") {
        liveCashSales += paid;
      } else if (inv.paymentMode === "UPI") {
        liveUpiSales += paid;
      } else if (inv.paymentMode === "CARD") {
        liveCardSales += paid;
      } else {
        // Multi-tender / Split or others:
        liveCashSales += paid;
      }
    }

    const totalPayouts = activeShift.payouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const openingFloat = Number(activeShift.openingFloat);
    const expectedCashInDrawer = openingFloat + liveCashSales - totalPayouts;

    return NextResponse.json({
      success: true,
      shift: activeShift,
      liveMetrics: {
        billCount: invoices.length,
        openingFloat,
        cashSales: liveCashSales,
        upiSales: liveUpiSales,
        cardSales: liveCardSales,
        creditSales: liveCreditSales,
        cashPayouts: totalPayouts,
        grossSales,
        expectedCashInDrawer,
      },
    });
  } catch (error: any) {
    console.error("Error fetching current shift:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch active shift" }, { status: 500 });
  }
}
