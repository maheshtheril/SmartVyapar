import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { AuditAction, PurchaseOrderStatus, StockLogType } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { GstCalculator } from "@/lib/gst";

export const dynamic = "force-dynamic";

/**
 * POST /api/purchase/orders/[id]/receive
 * Converts a Purchase Order into an actual Goods Receipt Note (GRN) & Purchase Bill:
 * 1. Generates sequential GRN-YYYY-XXXX.
 * 2. Increments inventory product stock.
 * 3. Records immutable StockLog entries.
 * 4. Posts double-entry ledger entries (Debits Inventory Asset & ITC, Credits Accounts Payable).
 * 5. Marks Purchase Order status as COMPLETED.
 */
export async function POST(
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

    if (order.status === PurchaseOrderStatus.COMPLETED) {
      return NextResponse.json(
        { error: "This Purchase Order has already been fully received and inwarded." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const supplierInvoiceNumber = body.supplierInvoiceNumber?.trim() || `INV-${order.poNumber}`;
    const warehouseId = body.warehouseId || null;

    // Generate statutory GRN sequence
    const currentYear = new Date().getFullYear();
    const grnCount = await prisma.purchaseBill.count({ where: { tenantId } });
    const grnNumber = `GRN-${currentYear}-${String(grnCount + 1).padStart(4, "0")}`;

    const supplierStateCode = order.supplierGstin ? order.supplierGstin.substring(0, 2) : tenant.stateCode;

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const billItemsToCreate = [];

      for (const poItem of order.items) {
        const qty = Number(poItem.orderedQuantity);
        const rate = Number(poItem.expectedRate);
        const lineTaxable = qty * rate;
        subtotal += lineTaxable;

        const tax = GstCalculator.calculate(
          lineTaxable,
          Number(poItem.gstRate || 18),
          tenant.stateCode,
          supplierStateCode,
          tenant.isComposition
        );

        totalCgst += tax.cgstAmount;
        totalSgst += tax.sgstAmount;
        totalIgst += tax.igstAmount;

        // 1. If product exists, increment its current stock
        if (poItem.productId) {
          await tx.product.update({
            where: { id: poItem.productId },
            data: {
              currentStock: { increment: qty },
            },
          });

          // 2. Record immutable StockLog
          await tx.stockLog.create({
            data: {
              tenantId,
              productId: poItem.productId,
              changeQty: qty,
              type: StockLogType.PURCHASE_IN,
              referenceId: grnNumber,
              note: `PO Inward: +${qty} ${poItem.unit} received from ${order.supplierName} (GRN #${grnNumber}, Ref PO #${order.poNumber})`,
            },
          });
        }

        billItemsToCreate.push({
          productId: poItem.productId,
          productName: poItem.productName,
          hsnCode: poItem.hsnCode,
          unit: poItem.unit,
          quantity: qty,
          packageSize: 1,
          baseQuantity: qty,
          purchasePrice: rate,
          discountPercent: 0,
          marginPercent: 30,
          sellingPrice: Math.round(rate * 1.3 * 100) / 100,
          mrp: Math.round(rate * 1.3 * 100) / 100,
          gstRate: Number(poItem.gstRate || 18),
          lineTotal: tax.totalAmount,
        });

        // Update item received quantity
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            receivedQuantity: qty,
          },
        });
      }

      const totalTax = totalCgst + totalSgst + totalIgst;
      const totalAmount = subtotal + totalTax;

      // 3. Create the official Purchase Bill
      const purchaseBill = await tx.purchaseBill.create({
        data: {
          tenantId,
          billNumber: supplierInvoiceNumber,
          grnNumber,
          billDate: new Date(),
          supplierName: order.supplierName,
          supplierGstin: order.supplierGstin,
          warehouseId,
          paymentTerms: "CREDIT",
          notes: `Created from Purchase Order #${order.poNumber}. ${order.notes || ""}`.trim(),
          totalTaxable: subtotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          totalAmount,
          isConfirmed: true,
          items: {
            create: billItemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      // 4. Update Double-Entry General Ledger:
      // Credit: Accounts Payable (2000) - supplier liability
      // Debit: Merchandise Inventory Asset (1200) - stock asset value
      // Debit: Input Tax Credit (1410/1420) - statutory ITC
      const payablesAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "2000" } },
      });
      const inventoryAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1200" } },
      });

      if (payablesAcc) {
        await tx.account.update({
          where: { id: payablesAcc.id },
          data: { balance: { increment: totalAmount } },
        });
      }

      if (inventoryAcc) {
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { increment: subtotal } },
        });
      }

      if (totalCgst > 0) {
        const cgstAcc = await tx.account.findUnique({
          where: { tenantId_code: { tenantId, code: "1410" } },
        });
        if (cgstAcc) {
          await tx.account.update({
            where: { id: cgstAcc.id },
            data: { balance: { increment: totalCgst } },
          });
        }
      }

      if (totalSgst > 0) {
        const sgstAcc = await tx.account.findUnique({
          where: { tenantId_code: { tenantId, code: "1420" } },
        });
        if (sgstAcc) {
          await tx.account.update({
            where: { id: sgstAcc.id },
            data: { balance: { increment: totalSgst } },
          });
        }
      }

      // 5. Mark Purchase Order as COMPLETED
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: PurchaseOrderStatus.COMPLETED,
        },
      });

      // 6. Record Audit Log
      await recordAuditLog(
        {
          tenantId,
          userId: session.userId,
          userName: session.name,
          action: AuditAction.UPDATE,
          entityType: "PURCHASE_ORDER",
          entityId: order.id,
          details: {
            poNumber: order.poNumber,
            grnNumber,
            billNumber: supplierInvoiceNumber,
            totalAmount,
            status: "COMPLETED",
          },
        },
        tx
      );

      return {
        purchaseBill,
        order: updatedOrder,
        grnNumber,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${order.poNumber} successfully inwarded under GRN #${result.grnNumber}`,
      data: result,
    });
  } catch (error: any) {
    console.error("Error receiving purchase order:", error);
    return NextResponse.json({ error: error.message || "Failed to inward purchase order" }, { status: 500 });
  }
}
