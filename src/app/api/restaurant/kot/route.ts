import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { KotStatus, TableStatus, StockLogType } from "@prisma/client";
import { GstCalculator } from "@/lib/gst";
import { UpiService } from "@/lib/upi";

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
          currentTotal: {
            increment: totalKotAmount,
          },
        },
      });

      return kot;
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
