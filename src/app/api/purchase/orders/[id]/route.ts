import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { AuditAction, PurchaseOrderStatus } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/purchase/orders/[id]
 * Fetch a single Purchase Order with items
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id } = await params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order || order.tenantId !== tenantId) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Error fetching purchase order details:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch purchase order" }, { status: 500 });
  }
}

/**
 * PATCH /api/purchase/orders/[id]
 * Update status or details of a Purchase Order
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id } = await params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order || order.tenantId !== tenantId) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, notes, expectedDeliveryDate } = body;

    const updateData: any = {};
    if (status && Object.values(PurchaseOrderStatus).includes(status)) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.UPDATE,
      entityType: "PURCHASE_ORDER",
      entityId: id,
      details: { poNumber: order.poNumber, updatedFields: updateData },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json({ error: error.message || "Failed to update purchase order" }, { status: 500 });
  }
}

/**
 * DELETE /api/purchase/orders/[id]
 * Delete a draft or cancelled purchase order
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id } = await params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order || order.tenantId !== tenantId) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    if (order.status === PurchaseOrderStatus.COMPLETED) {
      return NextResponse.json(
        { error: "Cannot delete a completed Purchase Order that has already been inwarded" },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.DELETE,
      entityType: "PURCHASE_ORDER",
      entityId: id,
      details: { poNumber: order.poNumber },
    });

    return NextResponse.json({ success: true, message: "Purchase Order deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json({ error: error.message || "Failed to delete purchase order" }, { status: 500 });
  }
}
