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
          where: { status: { in: ["PREPARING", "READY", "SERVED"] } },
          include: {
            // Only live lines: voided and already-paid (split) items are hidden
            items: { where: { isVoided: false, settledInvoiceId: null } },
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
        assignedWaiter: status === "VACANT" ? null : String(waiterName || "").trim() || null,
      },
    });

    return NextResponse.json({ success: true, table: updated });
  } catch (error: any) {
    console.error("Error updating table:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/restaurant/tables - Create a new table from the UI
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { name, section = "Main Hall", capacity = 4 } = await req.json();

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Table name is required" }, { status: 400 });
    }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 100) {
      return NextResponse.json({ error: "Capacity must be between 1 and 100" }, { status: 400 });
    }

    const exists = await prisma.restaurantTable.findFirst({
      where: { tenantId, name: String(name).trim() },
    });
    if (exists) {
      return NextResponse.json({ error: `Table "${exists.name}" already exists` }, { status: 409 });
    }

    const table = await prisma.restaurantTable.create({
      data: {
        tenantId,
        name: String(name).trim(),
        section: String(section).trim() || "Main Hall",
        capacity: cap,
        status: TableStatus.VACANT,
      },
    });
    return NextResponse.json({ success: true, table });
  } catch (error: any) {
    console.error("Error creating table:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/restaurant/tables - Edit name / section / capacity of a table
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { tableId, name, section, capacity } = await req.json();

    const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, tenantId } });
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (name !== undefined && String(name).trim() !== table.name) {
      const dup = await prisma.restaurantTable.findFirst({
        where: { tenantId, name: String(name).trim(), NOT: { id: tableId } },
      });
      if (dup) {
        return NextResponse.json({ error: `Table "${dup.name}" already exists` }, { status: 409 });
      }
    }
    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isInteger(cap) || cap < 1 || cap > 100) {
        return NextResponse.json({ error: "Capacity must be between 1 and 100" }, { status: 400 });
      }
    }

    const updated = await prisma.restaurantTable.update({
      where: { id: tableId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(section !== undefined ? { section: String(section).trim() || "Main Hall" } : {}),
        ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
      },
    });
    return NextResponse.json({ success: true, table: updated });
  } catch (error: any) {
    console.error("Error editing table:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/restaurant/tables?id=... - Remove a vacant table with no history blocking it
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Table id is required" }, { status: 400 });
    }

    const table = await prisma.restaurantTable.findFirst({ where: { id, tenantId } });
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
    if (table.status !== TableStatus.VACANT) {
      return NextResponse.json({ error: "Cannot delete a table that is in use" }, { status: 409 });
    }

    // KOT history cascades with the table, so refuse if past orders exist (keeps audit trail)
    const history = await prisma.kitchenOrderTicket.count({ where: { tableId: id, tenantId } });
    if (history > 0) {
      return NextResponse.json(
        { error: "This table has order history and cannot be deleted. Rename it instead." },
        { status: 409 }
      );
    }

    await prisma.restaurantTable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting table:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
