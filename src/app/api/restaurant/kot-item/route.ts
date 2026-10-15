import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { TableStatus, AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

// Recompute the amount of a single KOT item after discount / complimentary / void
function lineNet(item: {
  quantity: any;
  unitPrice: any;
  discountAmount: any;
  isComplimentary: boolean;
  isVoided: boolean;
}) {
  if (item.isVoided || item.isComplimentary) return 0;
  const gross = Number(item.quantity) * Number(item.unitPrice);
  return Math.max(0, gross - Number(item.discountAmount || 0));
}

// PATCH /api/restaurant/kot-item
// Body: { itemId, action: "VOID" | "COMPLIMENTARY" | "DISCOUNT" | "UNDO_COMPLIMENTARY", reason?, discountAmount? }
export async function PATCH(req: NextRequest) {
  try {
    // Voids, discounts and comps are money-sensitive: owner/manager only
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { itemId, action, reason, discountAmount } = await req.json();

    if (!itemId || !action) {
      return NextResponse.json({ error: "itemId and action are required" }, { status: 400 });
    }

    const item = await prisma.kotItem.findFirst({
      where: { id: itemId, kot: { tenantId } },
      include: { kot: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.kot.status === "SETTLED" || item.kot.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot modify a settled KOT" }, { status: 400 });
    }

    const data: any = {};
    switch (action) {
      case "VOID":
        data.isVoided = true;
        data.voidedAt = new Date();
        data.voidReason = reason || "Cancelled by staff";
        break;
      case "COMPLIMENTARY":
        data.isComplimentary = true;
        break;
      case "UNDO_COMPLIMENTARY":
        data.isComplimentary = false;
        break;
      case "DISCOUNT": {
        const d = Number(discountAmount);
        const gross = Number(item.quantity) * Number(item.unitPrice);
        if (!Number.isFinite(d) || d < 0 || d > gross) {
          return NextResponse.json(
            { error: `Discount must be between 0 and ${gross}` },
            { status: 400 }
          );
        }
        data.discountAmount = d;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.kotItem.update({ where: { id: itemId }, data });

      // Recompute the KOT total and the table's running total from live items
      const kotItems = await tx.kotItem.findMany({ where: { kotId: item.kotId } });
      const kotTotal = kotItems.reduce((a, i) => a + lineNet(i), 0);
      await tx.kitchenOrderTicket.update({
        where: { id: item.kotId },
        data: { totalAmount: kotTotal },
      });

      const activeKots = await tx.kitchenOrderTicket.findMany({
        where: { tableId: item.kot.tableId, tenantId, status: { in: ["PREPARING", "READY", "SERVED"] } },
        select: { totalAmount: true },
      });
      const tableTotal = activeKots.reduce((a, k) => a + Number(k.totalAmount), 0);

      // If everything on the table has been voided, free the table
      const allItems = await tx.kotItem.findMany({
        where: { kot: { tableId: item.kot.tableId, tenantId, status: { in: ["PREPARING", "READY", "SERVED"] } } },
      });
      const allVoided = allItems.length > 0 && allItems.every((i) => i.isVoided);

      await tx.restaurantTable.update({
        where: { id: item.kot.tableId },
        data: allVoided
          ? { status: TableStatus.VACANT, currentTotal: 0, occupiedAt: null, assignedWaiter: null }
          : { currentTotal: tableTotal },
      });

      if (allVoided) {
        await tx.kitchenOrderTicket.updateMany({
          where: { tableId: item.kot.tableId, tenantId, status: { in: ["PREPARING", "READY", "SERVED"] } },
          data: { status: "CANCELLED" },
        });
      }

      return { kotTotal, tableTotal, tableFreed: allVoided };
    }, DEFAULT_TX_OPTIONS);

    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: action === "VOID" ? AuditAction.DELETE : AuditAction.UPDATE,
      entityType: "KOT_ITEM",
      entityId: itemId,
      details: {
        action,
        product: item.productName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        kotId: item.kotId,
        ...(action === "VOID" ? { reason: reason || "Cancelled by staff" } : {}),
        ...(action === "DISCOUNT" ? { discountAmount: Number(discountAmount) } : {}),
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Only an owner or manager can void, discount or comp items" }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error updating KOT item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
