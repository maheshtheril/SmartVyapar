import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/cash-drawer/open
 * Opens a new cash drawer shift with opening float.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();

    const { openingFloat = 0, notes = "" } = body;

    // Check if there is already an open shift
    const existingOpen = await prisma.cashDrawerShift.findFirst({
      where: {
        tenantId,
        status: "OPEN",
      },
    });

    if (existingOpen) {
      return NextResponse.json(
        { error: `Shift ${existingOpen.shiftNumber} is already open. Please close it before opening a new shift.` },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const count = await prisma.cashDrawerShift.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, 0, 1),
        },
      },
    });

    const shiftNumber = `SHIFT-${year}-${String(count + 1).padStart(4, "0")}`;

    const newShift = await prisma.cashDrawerShift.create({
      data: {
        tenantId,
        shiftNumber,
        openedByUserId: session.userId,
        openedByName: session.name || "Cashier",
        openingFloat: Number(openingFloat) || 0,
        expectedCash: Number(openingFloat) || 0,
        closingNotes: notes || null,
        status: "OPEN",
      },
      include: {
        payouts: true,
      },
    });

    return NextResponse.json({
      success: true,
      shift: newShift,
      message: `Shift ${shiftNumber} opened successfully with float ₹${Number(openingFloat).toFixed(2)}`,
    });
  } catch (error: any) {
    console.error("Error opening shift:", error);
    return NextResponse.json({ error: error.message || "Failed to open shift" }, { status: 500 });
  }
}
