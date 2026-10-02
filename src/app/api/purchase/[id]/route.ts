import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/purchase/[id] - Fetch single purchase bill
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const bill = await prisma.purchaseBill.findUnique({
      where: { id: params.id, tenantId: session.tenantId },
      include: { items: { include: { product: true } } },
    });
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    return NextResponse.json({ success: true, bill });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/purchase/[id] - Edit purchase bill: recalculates totals + reverses & re-posts ledger
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { supplierName, supplierGstin, billNumber, billDate, paymentTerms, notes, items } = body;

    // Load existing bill with old totals
    const existing = await prisma.purchaseBill.findUnique({
      where: { id: params.id, tenantId },
      include: { items: true },
    });
    if (!existing) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    // Old totals — needed to reverse ledger
    const oldTaxable   = Number(existing.totalTaxable);
    const oldCgst      = Number(existing.cgstAmount);
    const oldSgst      = Number(existing.sgstAmount);
    const oldIgst      = Number(existing.igstAmount);
    const oldTotal     = Number(existing.totalAmount);
    const oldPayment   = existing.paymentTerms;

    // Inter-state detection for new values
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const resolvedGstin = supplierGstin ?? existing.supplierGstin;
    let isInterState = false;
    if (resolvedGstin && resolvedGstin.length >= 2 && tenant?.stateCode) {
      isInterState = resolvedGstin.substring(0, 2) !== tenant.stateCode;
    }

    // Recalculate totals from updated items
    let totalTaxable = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0, totalAmount = 0;

    const processedItems = (items || existing.items).map((item: any) => {
      const qty        = Number(item.quantity || 1);
      const pkgSize    = Number(item.packageSize || 1);
      const rate       = Number(item.purchasePrice || 0);
      const discPct    = Number(item.discountPercent || 0);
      const discRate   = rate * (1 - discPct / 100);
      const baseCost   = Math.round((discRate / pkgSize) * 100) / 100;
      const taxable    = Math.round(discRate * qty * 100) / 100;
      const gstRate    = Number(item.gstRate || 18);

      let itemCgst = 0, itemSgst = 0, itemIgst = 0;
      if (isInterState) {
        itemIgst = Math.round((taxable * gstRate) / 100 * 100) / 100;
      } else {
        itemCgst = Math.round((taxable * (gstRate / 2)) / 100 * 100) / 100;
        itemSgst = Math.round((taxable * (gstRate / 2)) / 100 * 100) / 100;
      }
      const lineTotal = Math.round((taxable + itemCgst + itemSgst + itemIgst) * 100) / 100;

      totalTaxable += taxable;
      cgstAmount   += itemCgst;
      sgstAmount   += itemSgst;
      igstAmount   += itemIgst;
      totalAmount  += lineTotal;

      return { ...item, baseCostPrice: baseCost, lineTotal };
    });

    totalTaxable = Math.round(totalTaxable * 100) / 100;
    cgstAmount   = Math.round(cgstAmount   * 100) / 100;
    sgstAmount   = Math.round(sgstAmount   * 100) / 100;
    igstAmount   = Math.round(igstAmount   * 100) / 100;
    totalAmount  = Math.round(totalAmount  * 100) / 100;

    const newPayment = paymentTerms ?? oldPayment;

    const updatedBill = await prisma.$transaction(async (tx) => {

      // ── 1. Update bill header & totals ────────────────────────────────────
      const bill = await tx.purchaseBill.update({
        where: { id: params.id },
        data: {
          supplierName:  supplierName  ?? existing.supplierName,
          supplierGstin: resolvedGstin,
          billNumber:    billNumber    ?? existing.billNumber,
          billDate:      billDate ? new Date(billDate) : existing.billDate,
          paymentTerms:  newPayment,
          notes:         notes         ?? existing.notes,
          totalTaxable,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalAmount,
        },
      });

      // ── 2. Update item pricing ─────────────────────────────────────────────
      for (const item of processedItems) {
        if (item.id) {
          await tx.purchaseBillItem.update({
            where: { id: item.id },
            data: {
              purchasePrice:  Number(item.purchasePrice  || 0),
              discountPercent:Number(item.discountPercent|| 0),
              baseCostPrice:  item.baseCostPrice,
              sellingPrice:   item.sellingPrice  ? Number(item.sellingPrice)  : undefined,
              mrp:            item.mrp           ? Number(item.mrp)           : undefined,
              gstRate:        Number(item.gstRate|| 18),
              lineTotal:      item.lineTotal,
              batchNumber:    item.batchNumber   ?? undefined,
              expiryDate:     item.expiryDate    ? new Date(item.expiryDate)  : undefined,
            },
          });

          // Sync product cost / selling price
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                purchasePrice: item.baseCostPrice,
                ...(item.sellingPrice ? { sellingPrice: Number(item.sellingPrice) } : {}),
                ...(item.mrp         ? { mrp:          Number(item.mrp)           } : {}),
              },
            });
          }
        }
      }

      // ── 3. Load Chart of Accounts ──────────────────────────────────────────
      const accounts = await tx.account.findMany({
        where: {
          tenantId,
          code: { in: ["1300", "1410", "1420", "1430", "2000", "1000", "1010"] },
        },
      });
      const acc = new Map(accounts.map((a) => [a.code, a]));
      const inventoryAcc = acc.get("1300");
      const cgstAcc      = acc.get("1410");
      const sgstAcc      = acc.get("1420");
      const igstAcc      = acc.get("1430");
      const apAcc        = acc.get("2000");
      const cashAcc      = acc.get("1000");
      const bankAcc      = acc.get("1010");

      // ── 4. REVERSE old ledger entries ─────────────────────────────────────
      // Debit side: undo inventory & ITC
      if (inventoryAcc) {
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { decrement: oldTaxable } },
        });
      }
      if (cgstAcc && oldCgst > 0) {
        await tx.account.update({ where: { id: cgstAcc.id }, data: { balance: { decrement: oldCgst } } });
      }
      if (sgstAcc && oldSgst > 0) {
        await tx.account.update({ where: { id: sgstAcc.id }, data: { balance: { decrement: oldSgst } } });
      }
      if (igstAcc && oldIgst > 0) {
        await tx.account.update({ where: { id: igstAcc.id }, data: { balance: { decrement: oldIgst } } });
      }
      // Credit side: undo payable / cash / bank
      if (oldPayment === "CREDIT" && apAcc) {
        await tx.account.update({ where: { id: apAcc.id  }, data: { balance: { decrement: oldTotal } } });
      } else if (oldPayment === "CASH" && cashAcc) {
        await tx.account.update({ where: { id: cashAcc.id }, data: { balance: { increment: oldTotal } } });
      } else if ((oldPayment === "BANK_TRANSFER" || oldPayment === "UPI") && bankAcc) {
        await tx.account.update({ where: { id: bankAcc.id }, data: { balance: { increment: oldTotal } } });
      }

      // ── 5. POST new ledger entries ─────────────────────────────────────────
      if (inventoryAcc) {
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { increment: totalTaxable } },
        });
      }
      if (cgstAcc && cgstAmount > 0) {
        await tx.account.update({ where: { id: cgstAcc.id }, data: { balance: { increment: cgstAmount } } });
      }
      if (sgstAcc && sgstAmount > 0) {
        await tx.account.update({ where: { id: sgstAcc.id }, data: { balance: { increment: sgstAmount } } });
      }
      if (igstAcc && igstAmount > 0) {
        await tx.account.update({ where: { id: igstAcc.id }, data: { balance: { increment: igstAmount } } });
      }
      if (newPayment === "CREDIT" && apAcc) {
        await tx.account.update({ where: { id: apAcc.id   }, data: { balance: { increment: totalAmount } } });
      } else if (newPayment === "CASH" && cashAcc) {
        await tx.account.update({ where: { id: cashAcc.id }, data: { balance: { decrement: totalAmount } } });
      } else if ((newPayment === "BANK_TRANSFER" || newPayment === "UPI") && bankAcc) {
        await tx.account.update({ where: { id: bankAcc.id }, data: { balance: { decrement: totalAmount } } });
      }

      // ── 6. Audit log ───────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          tenantId,
          userId:   session.userId,
          userName: session.name || "Manager",
          action:   AuditAction.UPDATE,
          entityType: "PURCHASE_BILL",
          entityId:   bill.id,
          details: {
            billNumber:   bill.billNumber,
            grnNumber:    bill.grnNumber,
            oldTotal,
            newTotal:     totalAmount,
            ledgerReversed: true,
          },
        },
      });

      return bill;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: "Purchase bill updated & ledger re-posted successfully",
      bill: updatedBill,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.name === "AuthError")      return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Error updating purchase bill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/purchase/[id] - Reverses a purchase entirely if no stock was consumed
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const bill = await prisma.purchaseBill.findUnique({
      where: { id: params.id, tenantId },
      include: { items: true },
    });
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    // 1. Verify stock has not been consumed
    for (const item of bill.items) {
      if (!item.productId) continue;
      
      const batch = await prisma.batch.findFirst({
        where: { tenantId, productId: item.productId, batchNumber: item.batchNumber || "" }
      });
      
      // If batch exists and current stock is LESS than what we purchased, stock was consumed.
      if (batch && Number(batch.currentStock) < Number(item.baseQuantity)) {
        return NextResponse.json(
          { error: `Cannot delete: Stock for ${item.productName} has already been consumed or sold.` },
          { status: 400 }
        );
      }
    }

    // 2. Perform deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // Revert Stock and Batches
      for (const item of bill.items) {
        if (!item.productId) continue;

        // Decrement Product Stock
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.baseQuantity } },
        });

        // Decrement Batch Stock
        const batch = await tx.batch.findFirst({
          where: { tenantId, productId: item.productId, batchNumber: item.batchNumber || "" }
        });
        if (batch) {
          await tx.batch.update({
            where: { id: batch.id },
            data: { currentStock: { decrement: item.baseQuantity } },
          });
        }

        // Decrement Warehouse Stock
        if (bill.warehouseId) {
          const whStock = await tx.warehouseStock.findUnique({
            where: { warehouseId_productId: { warehouseId: bill.warehouseId, productId: item.productId } }
          });
          if (whStock) {
            await tx.warehouseStock.update({
              where: { id: whStock.id },
              data: { quantity: { decrement: item.baseQuantity } },
            });
          }
        }

        // Delete Stock Logs for this bill
        await tx.stockLog.deleteMany({
          where: { tenantId, referenceId: bill.billNumber, type: "PURCHASE_IN" }
        });
      }

      // Reverse Accounts
      const accounts = await tx.account.findMany({
        where: { tenantId, code: { in: ["1300", "1410", "1420", "1430", "2000", "1000", "1010"] } }
      });
      const accountMap = new Map(accounts.map((a) => [a.code, a]));
      
      if (accountMap.get("1300")) {
        await tx.account.update({ where: { id: accountMap.get("1300")!.id }, data: { balance: { decrement: bill.totalTaxable } } });
      }
      if (accountMap.get("1410") && Number(bill.cgstAmount) > 0) {
        await tx.account.update({ where: { id: accountMap.get("1410")!.id }, data: { balance: { decrement: bill.cgstAmount } } });
      }
      if (accountMap.get("1420") && Number(bill.sgstAmount) > 0) {
        await tx.account.update({ where: { id: accountMap.get("1420")!.id }, data: { balance: { decrement: bill.sgstAmount } } });
      }
      if (accountMap.get("1430") && Number(bill.igstAmount) > 0) {
        await tx.account.update({ where: { id: accountMap.get("1430")!.id }, data: { balance: { decrement: bill.igstAmount } } });
      }

      const paymentTerms = bill.paymentTerms;
      const totalAmount = bill.totalAmount;
      if (paymentTerms === "CREDIT" && accountMap.get("2000")) {
        await tx.account.update({ where: { id: accountMap.get("2000")!.id }, data: { balance: { decrement: totalAmount } } });
      } else if (paymentTerms === "CASH" && accountMap.get("1000")) {
        await tx.account.update({ where: { id: accountMap.get("1000")!.id }, data: { balance: { increment: totalAmount } } });
      } else if ((paymentTerms === "BANK_TRANSFER" || paymentTerms === "UPI") && accountMap.get("1010")) {
        await tx.account.update({ where: { id: accountMap.get("1010")!.id }, data: { balance: { increment: totalAmount } } });
      }

      // Delete Bill Items
      await tx.purchaseBillItem.deleteMany({ where: { purchaseBillId: bill.id } });
      
      // Delete Bill
      await tx.purchaseBill.delete({ where: { id: bill.id } });

      // Clean up orphaned products
      for (const item of bill.items) {
        if (!item.productId) continue;
        const otherUses = await tx.purchaseBillItem.count({ where: { productId: item.productId } });
        const salesUses = await tx.invoiceItem.count({ where: { productId: item.productId } });
        if (otherUses === 0 && salesUses === 0) {
          await tx.product.delete({ where: { id: item.productId } });
        }
      }

      // Clean up orphaned supplier
      if (bill.supplierId) {
        const otherBills = await tx.purchaseBill.count({ where: { supplierId: bill.supplierId } });
        if (otherBills === 0) {
          const supplier = await tx.supplier.findUnique({ where: { id: bill.supplierId } });
          await tx.supplier.delete({ where: { id: bill.supplierId } });
          if (supplier?.accountId) {
             await tx.account.delete({ where: { id: supplier.accountId } });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          userName: session.name || "Manager",
          action: AuditAction.DELETE,
          entityType: "PURCHASE_BILL",
          entityId: bill.id,
          details: { billNumber: bill.billNumber, totalAmount: bill.totalAmount },
        }
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ success: true, message: "Purchase bill successfully deleted." });
  } catch (error: any) {
    if (error.name === "ForbiddenError") return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.name === "AuthError")      return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Error deleting purchase bill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

