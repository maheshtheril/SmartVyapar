import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { KotStatus, TableStatus, StockLogType } from "@prisma/client";
import { GstCalculator } from "@/lib/gst";
import { UpiService } from "@/lib/upi";
import { restaurantEventBus } from "@/lib/restaurant-events";

export const dynamic = "force-dynamic";

// POST /api/restaurant/kot - Fire new KOT to Kitchen
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      tableId,
      waiterName = "Captain",
      guestCount = 2,
      items,
    } = body;

    if (!tableId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Table ID and non-empty items array are required" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, tenantId },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Generate KOT number
    const kotCount = await prisma.kitchenOrderTicket.count({
      where: { tenantId },
    });
    const kotNumber = `KOT-${(kotCount + 1).toString().padStart(4, "0")}`;

    let totalKotAmount = 0;
    items.forEach((item: any) => {
      totalKotAmount += Number(item.unitPrice || 0) * Number(item.quantity || 1);
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create KOT record
      const kot = await tx.kitchenOrderTicket.create({
        data: {
          tenantId,
          tableId,
          kotNumber,
          guestCount: Number(guestCount || 2),
          waiterName: waiterName || "Captain",
          status: KotStatus.PREPARING,
          totalAmount: totalKotAmount,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: Number(i.quantity || 1),
              unitPrice: Number(i.unitPrice || 0),
              notes: i.notes || null,
            })),
          },
        },
        include: {
          items: true,
          table: true,
        },
      });

      // 2. Update Table status to OCCUPIED and update running total
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.OCCUPIED,
          occupiedAt: table.occupiedAt || new Date(),
          assignedWaiter: table.assignedWaiter || waiterName || "Captain",
          currentTotal: {
            increment: totalKotAmount,
          },
        },
      });

      return kot;
    }, DEFAULT_TX_OPTIONS);

    // Emit real-time event to KDS and waiter displays
    restaurantEventBus.emitTenantEvent({
      type: "kot.created",
      tenantId,
      tableId,
      tableName: table.name,
      kotId: result.id,
      kotNumber: result.kotNumber,
      status: result.status,
      timestamp: new Date().toISOString(),
      data: result,
    });

    return NextResponse.json({
      success: true,
      kot: result,
      business: {
        name: tenant.businessName,
        phone: tenant.phone,
      },
    });
  } catch (error: any) {
    console.error("Error creating KOT:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/restaurant/kot - Advance kitchen status: PREPARING -> READY -> SERVED
// Body: { kotId, status: "READY" | "SERVED" }
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { kotId, status } = await req.json();

    if (!kotId || !["READY", "SERVED"].includes(status)) {
      return NextResponse.json({ error: "kotId and status (READY or SERVED) are required" }, { status: 400 });
    }

    const kot = await prisma.kitchenOrderTicket.findFirst({ where: { id: kotId, tenantId } });
    if (!kot) {
      return NextResponse.json({ error: "KOT not found" }, { status: 404 });
    }

    // Only allow forward moves from an open state
    const allowed: Record<string, string[]> = {
      READY: ["PREPARING"],
      SERVED: ["PREPARING", "READY"],
    };
    if (!allowed[status].includes(kot.status)) {
      return NextResponse.json({ error: `Cannot move a ${kot.status} KOT to ${status}` }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const k = await tx.kitchenOrderTicket.update({
        where: { id: kotId },
        data: { status: status as KotStatus },
      });
      if (status === "SERVED") {
        await tx.kotItem.updateMany({ where: { kotId, isVoided: false }, data: { isServed: true } });
      }
      return k;
    });

    // Emit real-time status update to KDS and floor screens
    restaurantEventBus.emitTenantEvent({
      type: "kot.status_changed",
      tenantId,
      tableId: kot.tableId,
      kotId: updated.id,
      kotNumber: kot.kotNumber,
      status: updated.status,
      timestamp: new Date().toISOString(),
      data: updated,
    });

    return NextResponse.json({ success: true, kot: updated });
  } catch (error: any) {
    console.error("Error updating KOT status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
