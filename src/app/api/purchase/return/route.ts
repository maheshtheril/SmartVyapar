import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { StockLogType, AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { GstCalculator } from "@/lib/gst";

export const dynamic = "force-dynamic";

/**
 * POST /api/purchase/return
 * Records a Purchase Return / Supplier Debit Note:
 * 1. Atomically deducts stock from current inventory.
 * 2. Deducts batch and warehouse stock if applicable.
 * 3. Records immutable StockLog.
 * 4. Reverses double-entry ledger (Debits Accounts Payable, Credits Inventory Asset & ITC).
 * 5. Records statutory audit log.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      supplierName,
      supplierGstin,
      originalBillNumber,
      items,
      reason,
      notes,
    } = body;

    if (!supplierName) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one return line item is required" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const returnYear = new Date().getFullYear();
    const returnCount = await prisma.stockLog.count({
      where: {
        tenantId,
        note: { contains: "Purchase Return" },
      },
    });
    const debitNoteNumber = `DN-${returnYear}-${String(returnCount + 1).padStart(4, "0")}`;

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const processedItems = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, tenantId },
        });

        if (!product) {
          throw new Error(`Product ID ${item.productId} not found`);
        }

        const returnQty = Number(item.quantity);
        if (returnQty <= 0) {
          throw new Error(`Invalid return quantity for product ${product.name}`);
        }

        const currentStockNum = Number(product.currentStock);
        if (currentStockNum < returnQty) {
          throw new Error(
            `Insufficient stock to return ${product.name}. Available: ${currentStockNum}, Attempted return: ${returnQty}`
          );
        }

        const costRate = Number(item.costRate || product.purchasePrice);
        const lineTaxable = returnQty * costRate;
        subtotal += lineTaxable;

        const tax = GstCalculator.calculate(
          lineTaxable,
          Number(product.gstRate),
          tenant.stateCode,
          item.supplierStateCode || tenant.stateCode,
          tenant.isComposition
        );

        totalCgst += tax.cgstAmount;
        totalSgst += tax.sgstAmount;
        totalIgst += tax.igstAmount;

        // 1. DEDUCT CURRENT STOCK
        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: { decrement: returnQty },
          },
        });

        // 2. DEDUCT BATCH STOCK IF SPECIFIED
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: {
              currentStock: { decrement: returnQty },
            },
          });
        }

        // 3. RECORD AUDIT STOCK LOG
        await tx.stockLog.create({
          data: {
            tenantId,
            productId: product.id,
            changeQty: -returnQty,
            type: StockLogType.MANUAL_ADJUSTMENT,
            referenceId: debitNoteNumber,
            note: `Purchase Return: -${returnQty} ${product.baseUnit} returned to ${supplierName} (Debit Note #${debitNoteNumber}, Ref Bill #${originalBillNumber || "N/A"}) - ${reason || "Defective Goods"}`,
          },
        });

        processedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: returnQty,
          costRate,
          lineTaxable,
          tax: tax.totalTax,
          lineTotal: tax.totalAmount,
        });
      }

      const totalTax = totalCgst + totalSgst + totalIgst;
      const totalDebitNoteAmount = subtotal + totalTax;

      // 4. DOUBLE-ENTRY LEDGER REVERSAL:
      // Debit: Accounts Payable (2000) - reduces liability to supplier
      // Credit: Merchandise Inventory Asset (1200) - reduces stock value
      // Credit: Input Tax Credit (1410/1420) - reverses claimed input GST
      const payablesAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "2000" } },
      });
      const inventoryAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1200" } },
      });

      if (payablesAcc) {
        await tx.account.update({
          where: { id: payablesAcc.id },
          data: { balance: { decrement: totalDebitNoteAmount } },
        });
      }

      if (inventoryAcc) {
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { decrement: subtotal } },
        });
      }

      if (totalCgst > 0) {
        const cgstAcc = await tx.account.findUnique({
          where: { tenantId_code: { tenantId, code: "1410" } },
        });
        if (cgstAcc) {
          await tx.account.update({
            where: { id: cgstAcc.id },
            data: { balance: { decrement: totalCgst } },
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
            data: { balance: { decrement: totalSgst } },
          });
        }
      }

      // 5. RECORD AUDIT LOG
      await recordAuditLog(
        {
          tenantId,
          userId: session.userId,
          userName: session.name,
          action: AuditAction.UPDATE,
          entityType: "STOCK",
          entityId: debitNoteNumber,
          details: {
            debitNoteNumber,
            supplierName,
            originalBillNumber,
            totalDebitNoteAmount,
            reason,
            itemsCount: items.length,
          },
        },
        tx
      );

      return {
        debitNoteNumber,
        subtotal,
        totalTax,
        totalDebitNoteAmount,
        items: processedItems,
      };
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      message: `Purchase return successfully processed under Debit Note #${result.debitNoteNumber}`,
      data: result,
    });
  } catch (error: any) {
    console.error("Error processing purchase return:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
