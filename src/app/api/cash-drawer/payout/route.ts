import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/cash-drawer/payout
 * Records a petty cash payout from the open till.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();

    const { amount, reason, paidTo, approvedBy } = body;

    const payoutAmount = Number(amount);
    if (!payoutAmount || payoutAmount <= 0) {
      return NextResponse.json({ error: "Invalid payout amount" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason for payout is required" }, { status: 400 });
    }

    // Find current active shift
    const activeShift = await prisma.cashDrawerShift.findFirst({
      where: {
        tenantId,
        status: "OPEN",
      },
    });

    if (!activeShift) {
      return NextResponse.json({ error: "No active cash drawer shift is currently open" }, { status: 400 });
    }

    // Create payout and update shift in a transaction
    const [payout, updatedShift] = await prisma.$transaction([
      prisma.cashDrawerPayout.create({
        data: {
          tenantId,
          shiftId: activeShift.id,
          amount: payoutAmount,
          reason: reason.trim(),
          paidTo: paidTo ? paidTo.trim() : null,
          approvedBy: approvedBy ? approvedBy.trim() : session.name || null,
        },
      }),
      prisma.cashDrawerShift.update({
        where: { id: activeShift.id },
        data: {
          cashPayouts: {
            increment: payoutAmount,
          },
        },
        include: {
          payouts: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      payout,
      shift: updatedShift,
      message: `Petty cash payout of ₹${payoutAmount.toFixed(2)} recorded for "${reason.trim()}"`,
    });
  } catch (error: any) {
    console.error("Error creating payout:", error);
    return NextResponse.json({ error: error.message || "Failed to record payout" }, { status: 500 });
  }
}
