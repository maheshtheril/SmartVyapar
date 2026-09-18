import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { TableStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Standard initial seed tables for restaurant
const DEFAULT_TABLES = [
  { name: "T-01", section: "Main Dining", capacity: 4 },
  { name: "T-02", section: "Main Dining", capacity: 4 },
  { name: "T-03", section: "Main Dining", capacity: 2 },
  { name: "T-04", section: "Main Dining", capacity: 6 },
  { name: "AC-01", section: "AC Family Room", capacity: 6 },
  { name: "AC-02", section: "AC Family Room", capacity: 4 },
  { name: "AC-03", section: "AC Family Room", capacity: 8 },
  { name: "ROOF-01", section: "Rooftop Garden", capacity: 4 },
  { name: "ROOF-02", section: "Rooftop Garden", capacity: 4 },
  { name: "PARCEL-1", section: "Takeaway / Parcel", capacity: 1 },
];

// GET /api/restaurant/tables - List all tables with active KOT details
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    let tables = await prisma.restaurantTable.findMany({
      where: { tenantId },
      include: {
        kots: {
          where: { status: { in: ["PREPARING", "SERVED"] } },
          include: {
            items: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Auto-seed tables if first time
    if (tables.length === 0) {
      await prisma.$transaction(
        DEFAULT_TABLES.map((t) =>
          prisma.restaurantTable.create({
            data: {
              tenantId,
              name: t.name,
              section: t.section,
              capacity: t.capacity,
              status: TableStatus.VACANT,
            },
          })
        )
      );

      tables = await prisma.restaurantTable.findMany({
        where: { tenantId },
        include: {
          kots: {
            include: { items: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    // Compute metrics
    const totalTables = tables.length;
    const occupiedCount = tables.filter((t) => t.status === TableStatus.OCCUPIED).length;
    const vacantCount = tables.filter((t) => t.status === TableStatus.VACANT).length;
    const billedCount = tables.filter((t) => t.status === TableStatus.BILLED).length;

    return NextResponse.json({
      success: true,
      tables,
      metrics: {
        totalTables,
        occupiedCount,
        vacantCount,
        billedCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching restaurant tables:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/restaurant/tables - Open table session or update status
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      tableId,
      status = "OCCUPIED",
      guestCount = 2,
      waiterName = "Captain 1",
    } = body;

    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, tenantId },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const updated = await prisma.restaurantTable.update({
      where: { id: tableId },
      data: {
        status: status as TableStatus,
        occupiedAt: status === "OCCUPIED" ? new Date() : null,
        currentTotal: status === "VACANT" ? 0 : undefined,
      },
    });

    return NextResponse.json({ success: true, table: updated });
  } catch (error: any) {
    console.error("Error updating table:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
