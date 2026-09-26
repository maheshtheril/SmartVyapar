export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { CreateWarehouseSchema } from "@/lib/schemas/warehouse";
import { ensureDefaultWarehouse } from "@/lib/warehouse-transfer";

// GET /api/warehouses - List all warehouses for tenant
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    // Ensure at least default warehouse exists
    await ensureDefaultWarehouse(tenantId);

    const warehouses = await prisma.warehouse.findMany({
      where: { tenantId },
      include: {
        stocks: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseUnit: true,
                sellingPrice: true,
              },
            },
          },
        },
        _count: {
          select: {
            transfersSent: true,
            transfersReceived: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      warehouses,
    });
  } catch (error: any) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/warehouses - Create a new warehouse
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    if (session.role === "STAFF") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only Owners and Managers can create warehouses." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = validateBody(CreateWarehouseSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { name, code, address, city, isDefault } = validation.data;

    // Check code uniqueness
    const existing = await prisma.warehouse.findFirst({
      where: { tenantId, code: code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A warehouse with code "${code.toUpperCase()}" already exists.` },
        { status: 400 }
      );
    }

    if (isDefault) {
      // Unset previous default
      await prisma.warehouse.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        tenantId,
        name,
        code: code.toUpperCase(),
        address: address || null,
        city: city || "Kochi",
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Warehouse created successfully",
      warehouse,
    });
  } catch (error: any) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
