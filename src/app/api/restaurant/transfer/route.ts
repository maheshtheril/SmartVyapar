import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { TableStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/restaurant/transfer - Move all active KOTs from one table to another
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { fromTableId, toTableId } = await req.json();

    if (!fromTableId || !toTableId) {
      return NextResponse.json({ error: "fromTableId and toTableId are required" }, { status: 400 });
    }
    if (fromTableId === toTableId) {
      return NextResponse.json({ error: "Source and destination table must differ" }, { status: 400 });
    }

    const [from, to] = await Promise.all([
      prisma.restaurantTable.findFirst({ where: { id: fromTableId, tenantId } }),
      prisma.restaurantTable.findFirst({ where: { id: toTableId, tenantId } }),
    ]);

    if (!from || !to) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
    if (from.status !== TableStatus.OCCUPIED) {
      return NextResponse.json({ error: "Source table is not occupied" }, { status: 400 });
    }
    if (to.status !== TableStatus.VACANT) {
      return NextResponse.json({ error: `Destination table ${to.name} is not vacant` }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      // Re-point all active KOTs to the new table
      await tx.kitchenOrderTicket.updateMany({
        where: { tableId: fromTableId, tenantId, status: { in: ["PREPARING", "READY", "SERVED"] } },
        data: { tableId: toTableId },
      });

      // Destination takes over the session
      await tx.restaurantTable.update({
        where: { id: toTableId },
        data: {
          status: TableStatus.OCCUPIED,
          currentTotal: from.currentTotal,
          occupiedAt: from.occupiedAt,
          assignedWaiter: from.assignedWaiter,
        },
      });

      // Source is freed
      await tx.restaurantTable.update({
        where: { id: fromTableId },
        data: { status: TableStatus.VACANT, currentTotal: 0, occupiedAt: null, assignedWaiter: null },
      });
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      message: `Moved from ${from.name} to ${to.name}`,
    });
  } catch (error: any) {
    console.error("Error transferring table:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
