import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { AuditAction, PurchaseOrderStatus } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/purchase/orders
 * Returns list of Purchase Orders for the tenant with optional search & status filter
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = { tenantId };

    if (status && Object.values(PurchaseOrderStatus).includes(status as any)) {
      where.status = status as PurchaseOrderStatus;
    }

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: "insensitive" } },
        { supplierName: { contains: search, mode: "insensitive" } },
        { supplierGstin: { contains: search, mode: "insensitive" } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { orderDate: "desc" },
        take: 100,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    // Compute status summary counts
    const allTenantOrders = await prisma.purchaseOrder.findMany({
      where: { tenantId },
      select: { status: true, totalAmount: true },
    });

    const summary = {
      totalOrders: allTenantOrders.length,
      draftCount: allTenantOrders.filter((o) => o.status === PurchaseOrderStatus.DRAFT).length,
      orderedCount: allTenantOrders.filter((o) => o.status === PurchaseOrderStatus.ORDERED).length,
      completedCount: allTenantOrders.filter((o) => o.status === PurchaseOrderStatus.COMPLETED).length,
      totalOrderedValue: allTenantOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      orders,
      totalCount,
      summary,
    });
  } catch (error: any) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch purchase orders" }, { status: 500 });
  }
}

/**
 * POST /api/purchase/orders
 * Creates a new Purchase Order
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      supplierName,
      supplierGstin,
      supplierPhone,
      supplierAddress,
      expectedDeliveryDate,
      notes,
      items,
      status = PurchaseOrderStatus.ORDERED,
    } = body;

    if (!supplierName?.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required in the Purchase Order" }, { status: 400 });
    }

    // Generate sequential PO Number: PO-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const poCount = await prisma.purchaseOrder.count({
      where: { tenantId },
    });
    const poNumber = `PO-${currentYear}-${String(poCount + 1).padStart(4, "0")}`;

    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = items.map((item: any) => {
      const qty = Number(item.orderedQuantity || item.quantity || 1);
      const rate = Number(item.expectedRate || item.purchasePrice || 0);
      const gst = Number(item.gstRate ?? 18);
      const lineTaxable = qty * rate;
      const lineTax = (lineTaxable * gst) / 100;
      const lineTotal = lineTaxable + lineTax;

      subtotal += lineTaxable;
      taxAmount += lineTax;

      return {
        productId: item.productId || null,
        productName: item.productName || "Unnamed Item",
        hsnCode: item.hsnCode || null,
        unit: item.unit || "PCS",
        orderedQuantity: qty,
        expectedRate: rate,
        gstRate: gst,
        lineTotal: lineTotal,
      };
    });

    const totalAmount = subtotal + taxAmount;

    const order = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplierName: supplierName.trim(),
        supplierGstin: supplierGstin?.trim() || null,
        supplierPhone: supplierPhone?.trim() || null,
        supplierAddress: supplierAddress?.trim() || null,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        notes: notes?.trim() || null,
        status: status as PurchaseOrderStatus,
        subtotal,
        taxAmount,
        totalAmount,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Record audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.CREATE,
      entityType: "PURCHASE_ORDER",
      entityId: order.id,
      details: {
        poNumber: order.poNumber,
        supplierName: order.supplierName,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${order.poNumber} created successfully`,
      order,
    });
  } catch (error: any) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json({ error: error.message || "Failed to create purchase order" }, { status: 500 });
  }
}
