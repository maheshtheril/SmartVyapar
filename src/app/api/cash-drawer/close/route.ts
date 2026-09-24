import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/cash-drawer/close
 * Closes the active shift, calculates variances against denominations counted,
 * and generates the statutory Z-Report.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();

    const {
      denominations = {},
      closingNotes = "",
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      // Find active shift
      const activeShift = await tx.cashDrawerShift.findFirst({
        where: {
          tenantId,
          status: "OPEN",
        },
        include: {
          payouts: true,
        },
      });

      if (!activeShift) {
        throw new Error("No active cash drawer shift is currently open");
      }

      // Denominations breakdown
      const n500 = Number(denominations.c500 || 0);
      const n200 = Number(denominations.c200 || 0);
      const n100 = Number(denominations.c100 || 0);
      const n50  = Number(denominations.c50  || 0);
      const n20  = Number(denominations.c20  || 0);
      const n10  = Number(denominations.c10  || 0);
      const coins = Number(denominations.coins || 0);

      const actualCashCounted =
        n500 * 500 +
        n200 * 200 +
        n100 * 100 +
        n50 * 50 +
        n20 * 20 +
        n10 * 10 +
        coins;

      const now = new Date();
      // Use isReconciled instead of temporal queries to guarantee no orphaned or double-counted invoices
      const invoices = await tx.invoice.findMany({
        where: {
          tenantId,
          isReconciled: false,
          createdAt: {
            gte: activeShift.openedAt,
          }
        },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          dueAmount: true,
          paymentMode: true,
          paymentStatus: true,
        },
      });

      if (invoices.length > 0) {
        await tx.invoice.updateMany({
          where: { id: { in: invoices.map(i => i.id) } },
          data: { 
            isReconciled: true,
            shiftId: activeShift.id
          }
        });
      }

      let cashSales = 0;
      let upiSales = 0;
      let cardSales = 0;
      let creditSales = 0;
      let grossSales = 0;

      for (const inv of invoices) {
        const total = Number(inv.totalAmount || 0);
        const paid = Number(inv.paidAmount || 0);
        const due = Number(inv.dueAmount || 0);
        grossSales += total;

        if (due > 0) {
          creditSales += due;
        }

        if (inv.paymentMode === "CASH") {
          cashSales += paid;
        } else if (inv.paymentMode === "UPI") {
          upiSales += paid;
        } else if (inv.paymentMode === "CARD") {
          cardSales += paid;
        } else {
          cashSales += paid;
        }
      }

      const openingFloat = Number(activeShift.openingFloat);
      const cashPayouts = activeShift.payouts.reduce((sum, p) => sum + Number(p.amount), 0);
      const expectedCash = openingFloat + cashSales - cashPayouts;
      const cashDifference = actualCashCounted - expectedCash;

      const updatedShift = await tx.cashDrawerShift.updateMany({
        where: { id: activeShift.id, status: "OPEN" },
        data: {
          status: "CLOSED",
        closedAt: now,
        closedByUserId: session.userId,
        closedByName: session.name || "Cashier",
        cashSales,
        upiSales,
        cardSales,
        creditSales,
        cashPayouts,
        expectedCash,
        actualCashCounted,
        cashDifference,
        denominationsJson: JSON.stringify({
          c500: n500,
          c200: n200,
          c100: n100,
          c50: n50,
          c20: n20,
          c10: n10,
          coins,
        }),
        closingNotes: closingNotes ? closingNotes.trim() : null,
        },
      });

      if (updatedShift.count === 0) {
        throw new Error("Concurrency error: Cash drawer was closed by another user.");
      }

      // Fetch the closed shift since updateMany doesn't return it
      const closedShift = await tx.cashDrawerShift.findUnique({
        where: { id: activeShift.id },
        include: { payouts: true },
      });

      return { 
        closedShift: closedShift!, 
        invoices, 
        expectedCash,
        openingFloat,
        cashSales,
        upiSales,
        cardSales,
        creditSales,
        grossSales,
        cashPayouts,
        actualCashCounted,
        cashDifference,
        n500, n200, n100, n50, n20, n10, coins,
        now,
        activeShift
      };
    }, {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });

    const { 
      closedShift, invoices, expectedCash,
      openingFloat, cashSales, upiSales, cardSales, creditSales, grossSales,
      cashPayouts, actualCashCounted, cashDifference,
      n500, n200, n100, n50, n20, n10, coins,
      now, activeShift
    } = result;

    // Fetch tenant business profile for Z-Report header
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        businessName: true,
        address: true,
        stateCode: true,
        phone: true,
        gstin: true,
        upiId: true,
      },
    });

    const zReport = {
      tenant,
      shift: closedShift,
      billCount: invoices.length,
      openingFloat,
      sales: {
        cash: cashSales,
        upi: upiSales,
        card: cardSales,
        credit: creditSales,
        gross: grossSales,
      },
      payouts: {
        total: cashPayouts,
        items: activeShift.payouts,
      },
      reconciliation: {
        expectedCash,
        actualCash: actualCashCounted,
        variance: cashDifference,
        varianceType:
          cashDifference === 0
            ? "BALANCED"
            : cashDifference > 0
            ? "EXCESS"
            : "SHORTAGE",
      },
      denominations: {
        500: n500,
        200: n200,
        100: n100,
        50: n50,
        20: n20,
        10: n10,
        coins,
      },
      closedAt: now.toISOString(),
      closedByName: closedShift.closedByName,
    };

    return NextResponse.json({
      success: true,
      shift: closedShift,
      zReport,
      message: `Shift ${closedShift.shiftNumber} closed successfully.`,
    });
  } catch (error: any) {
    console.error("Error closing shift:", error);
    return NextResponse.json({ error: error.message || "Failed to close shift" }, { status: 500 });
  }
}
