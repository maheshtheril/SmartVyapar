import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { StockLogType, AuditAction } from "@prisma/client";

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

    // Block editing if bill was already soft-cancelled
    if (existing.isCancelled) {
      return NextResponse.json({ error: "Cannot edit a cancelled purchase bill" }, { status: 400 });
    }

    // Input validation
    if (supplierName !== undefined && !String(supplierName).trim()) {
      return NextResponse.json({ error: "Supplier name cannot be empty" }, { status: 400 });
    }
    if (billNumber !== undefined && !String(billNumber).trim()) {
      return NextResponse.json({ error: "Bill number cannot be empty" }, { status: 400 });
    }
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const row = `Row ${i + 1}`;
        if (it.purchasePrice !== undefined && (isNaN(Number(it.purchasePrice)) || Number(it.purchasePrice) < 0)) {
          return NextResponse.json({ error: `${row}: cost price cannot be negative` }, { status: 400 });
        }
        if (it.discountPercent !== undefined && (Number(it.discountPercent) < 0 || Number(it.discountPercent) > 100)) {
          return NextResponse.json({ error: `${row}: discount must be between 0 and 100` }, { status: 400 });
        }
        if (it.gstRate !== undefined && it.gstRate !== null && String(it.gstRate) !== "" && (Number(it.gstRate) < 0 || Number(it.gstRate) > 100)) {
          return NextResponse.json({ error: `${row}: GST rate must be between 0 and 100` }, { status: 400 });
        }
      }
    }

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
      const qty        = Math.max(0.001, Number(item.quantity || 1));
      const pkgSize    = Math.max(1, Number(item.packageSize || 1));
      const effectiveBaseQty = Math.round(qty * pkgSize * 1000) / 1000;
      const rate       = Number(item.purchasePrice || 0);
      const discPct    = Number(item.discountPercent || 0);
      const discRate   = rate * (1 - discPct / 100);
      const baseCost   = Math.round((discRate / pkgSize) * 100) / 100;
      const taxable    = Math.round(discRate * qty * 100) / 100;
      const gstRate    = item.gstRate === undefined || item.gstRate === null || String(item.gstRate) === '' ? 18 : Number(item.gstRate);

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

      let marginPct = item.marginPercent ? Number(item.marginPercent) : undefined;
      let sellingPrice = item.sellingPrice ? Number(item.sellingPrice) : undefined;
      if (sellingPrice && !marginPct && baseCost > 0) {
        marginPct = Math.round(((sellingPrice - baseCost) / baseCost) * 1000) / 10;
      } else if (marginPct && !sellingPrice) {
        sellingPrice = Math.round(baseCost * (1 + marginPct / 100) * 100) / 100;
      }

      return {
        id: item.id || undefined,
        productId: item.productId || null,
        productName: item.productName,
        suggestedDisplayName: item.suggestedDisplayName || null,
        partNumber: item.partNumber || null,
        batchNumber: item.batchNumber?.trim() || null,
        mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        hsnCode: item.hsnCode?.trim() || null,
        unit: (item.unit || "PCS").toUpperCase(),
        quantity: qty,
        packageSize: pkgSize,
        baseQuantity: effectiveBaseQty,
        purchasePrice: rate,
        discountPercent: discPct,
        baseCostPrice: baseCost,
        sellingPrice: sellingPrice,
        marginPercent: marginPct,
        mrp: item.mrp ? Number(item.mrp) : sellingPrice,
        gstRate: gstRate,
        lineTotal: lineTotal,
      };
    });

    totalTaxable = Math.round(totalTaxable * 100) / 100;
    cgstAmount   = Math.round(cgstAmount   * 100) / 100;
    sgstAmount   = Math.round(sgstAmount   * 100) / 100;
    igstAmount   = Math.round(igstAmount   * 100) / 100;
    totalAmount  = Math.round(totalAmount  * 100) / 100;

    const newPayment = paymentTerms ?? oldPayment;

    // Recalculate dueAmount and paymentStatus accurately
    const oldPaid = Number(existing.paidAmount || 0);
    let newDue = 0;
    let newPaymentStatus = existing.paymentStatus;
    if (newPayment === "CREDIT") {
      newDue = Math.max(0, Math.round((totalAmount - oldPaid) * 100) / 100);
      newPaymentStatus = newDue <= 0 ? "PAID" : (oldPaid > 0 ? "PARTIAL" : "UNPAID");
    } else {
      newDue = 0;
      newPaymentStatus = "PAID";
    }

    const updatedBill = await prisma.$transaction(async (tx) => {

      // ── 1. REVERSE OLD STOCK & BATCHES FROM PREVIOUS INWARD ─────────────
      for (const oldItem of existing.items) {
        if (!oldItem.productId) continue;

        // Decrement product current stock
        await tx.product.update({
          where: { id: oldItem.productId },
          data: { currentStock: { decrement: oldItem.baseQuantity } },
        });

        // Decrement batch stock if applicable
        if (oldItem.batchNumber) {
          const batch = await tx.batch.findFirst({
            where: { tenantId, productId: oldItem.productId, batchNumber: oldItem.batchNumber },
          });
          if (batch) {
            await tx.batch.update({
              where: { id: batch.id },
              data: { currentStock: { decrement: oldItem.baseQuantity } },
            });
          }
        }

        // Decrement warehouse stock if applicable
        if (existing.warehouseId) {
          const whStock = await tx.warehouseStock.findUnique({
            where: { warehouseId_productId: { warehouseId: existing.warehouseId, productId: oldItem.productId } },
          });
          if (whStock) {
            await tx.warehouseStock.update({
              where: { id: whStock.id },
              data: { quantity: { decrement: oldItem.baseQuantity } },
            });
          }
        }
      }

      // Clear previous purchase stock logs for this bill
      await tx.stockLog.deleteMany({
        where: { tenantId, referenceId: existing.billNumber, type: StockLogType.PURCHASE_IN },
      });

      // ── 2. UPDATE BILL HEADER & TOTALS ────────────────────────────────────
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
          dueAmount:     newDue,
          paymentStatus: newPaymentStatus,
        },
      });

      // ── 3. REMOVE ITEMS DELETED BY USER ──────────────────────────────────
      const incomingItemIds = new Set(processedItems.map((it: any) => it.id).filter(Boolean));
      await tx.purchaseBillItem.deleteMany({
        where: {
          purchaseBillId: existing.id,
          id: { notIn: Array.from(incomingItemIds) as string[] },
        },
      });

      // ── 4. PROCESS NEW & UPDATED ITEMS (APPLY NEW STOCK & BATCHES) ────────
      for (const item of processedItems) {
        // Resolve or create product
        let product: any = null;
        if (item.productId) {
          product = await tx.product.findUnique({ where: { id: item.productId } });
        }
        if (!product) {
          product = await tx.product.findFirst({
            where: { tenantId, name: { equals: item.productName, mode: "insensitive" } },
          });
        }
        if (!product) {
          const safeHsn = (item.hsnCode && typeof item.hsnCode === 'string' && item.hsnCode.trim())
            ? item.hsnCode.trim()
            : "9999";
          product = await tx.product.create({
            data: {
              tenant: { connect: { id: tenantId } },
              name: item.productName,
              displayName: item.suggestedDisplayName || item.productName,
              partNumber: item.partNumber ? String(item.partNumber).trim() : null,
              hsnCode: safeHsn,
              baseUnit: item.unit || "PCS",
              purchasePrice: Number(item.baseCostPrice || 0),
              sellingPrice: Number(item.sellingPrice || 0),
              mrp: item.mrp ? Number(item.mrp) : (item.sellingPrice ? Number(item.sellingPrice) : Number(item.baseCostPrice || 0)),
              gstRate: item.gstRate !== undefined && item.gstRate !== null ? Number(item.gstRate) : 18,
              currentStock: Number(item.baseQuantity || 0),
              minStockAlert: 5,
            },
          });
        } else {
          // Increment stock on the resolved product
          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: { increment: item.baseQuantity },
              ...(item.suggestedDisplayName ? { displayName: item.suggestedDisplayName } : {}),
              ...(item.partNumber ? { partNumber: item.partNumber } : {}),
              purchasePrice: item.baseCostPrice,
              ...(item.sellingPrice ? { sellingPrice: item.sellingPrice } : {}),
              ...(item.mrp ? { mrp: item.mrp } : {}),
            },
          });
        }

        // Upsert Batch if batchNumber is provided
        if (item.batchNumber) {
          const existingBatch = await tx.batch.findUnique({
            where: {
              tenantId_productId_batchNumber: {
                tenantId,
                productId: product.id,
                batchNumber: item.batchNumber,
              },
            },
          });

          if (existingBatch) {
            await tx.batch.update({
              where: { id: existingBatch.id },
              data: {
                currentStock: { increment: item.baseQuantity },
                costPrice: item.baseCostPrice,
                sellingPrice: item.sellingPrice,
                mrp: item.mrp,
                mfgDate: item.mfgDate || existingBatch.mfgDate,
                expiryDate: item.expiryDate || existingBatch.expiryDate,
              },
            });
          } else {
            await tx.batch.create({
              data: {
                tenantId,
                productId: product.id,
                batchNumber: item.batchNumber,
                mfgDate: item.mfgDate,
                expiryDate: item.expiryDate,
                costPrice: item.baseCostPrice,
                sellingPrice: item.sellingPrice,
                mrp: item.mrp,
                currentStock: item.baseQuantity,
                isActive: true,
              },
            });
          }
        }

        // Update WarehouseStock if warehouse is targeted
        const targetWarehouseId = existing.warehouseId;
        if (targetWarehouseId) {
          const existingWhStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: targetWarehouseId,
                productId: product.id,
              },
            },
          });

          if (existingWhStock) {
            await tx.warehouseStock.update({
              where: { id: existingWhStock.id },
              data: { quantity: { increment: item.baseQuantity } },
            });
          } else {
            await tx.warehouseStock.create({
              data: {
                warehouseId: targetWarehouseId,
                productId: product.id,
                quantity: item.baseQuantity,
              },
            });
          }
        }

        // Record audit StockLog
        await tx.stockLog.create({
          data: {
            tenantId,
            productId: product.id,
            changeQty: item.baseQuantity,
            type: StockLogType.PURCHASE_IN,
            referenceId: bill.billNumber,
            note: `Updated inward via ${bill.grnNumber || 'GRN'} from ${bill.supplierName} (Batch: ${item.batchNumber || "Standard"})`,
          },
        });

        // Update existing line or insert new line
        if (item.id) {
          await tx.purchaseBillItem.update({
            where: { id: item.id },
            data: {
              productId:       product.id,
              productName:     item.productName,
              batchNumber:     item.batchNumber,
              mfgDate:         item.mfgDate,
              expiryDate:      item.expiryDate,
              hsnCode:         item.hsnCode,
              unit:            item.unit,
              quantity:        item.quantity,
              packageSize:     item.packageSize,
              baseQuantity:    item.baseQuantity,
              purchasePrice:   item.purchasePrice,
              discountPercent: item.discountPercent,
              baseCostPrice:   item.baseCostPrice,
              sellingPrice:    item.sellingPrice,
              marginPercent:   item.marginPercent,
              mrp:             item.mrp,
              gstRate:         item.gstRate,
              lineTotal:       item.lineTotal,
            },
          });
        } else {
          await tx.purchaseBillItem.create({
            data: {
              purchaseBillId:  bill.id,
              productId:       product.id,
              productName:     item.productName,
              batchNumber:     item.batchNumber,
              mfgDate:         item.mfgDate,
              expiryDate:      item.expiryDate,
              hsnCode:         item.hsnCode,
              unit:            item.unit,
              quantity:        item.quantity,
              packageSize:     item.packageSize,
              baseQuantity:    item.baseQuantity,
              purchasePrice:   item.purchasePrice,
              discountPercent: item.discountPercent,
              baseCostPrice:   item.baseCostPrice,
              sellingPrice:    item.sellingPrice,
              marginPercent:   item.marginPercent,
              mrp:             item.mrp,
              gstRate:         item.gstRate,
              lineTotal:       item.lineTotal,
            },
          });
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
      const tenantMeta = await tx.tenant.findUnique({ where: { id: tenantId } });
        const isComp = tenantMeta?.isComposition === true;
        
        // Debit side: undo inventory & ITC
        if (inventoryAcc) {
          const oldInventoryDebit = isComp ? oldTotal : oldTaxable;
          await tx.account.update({
            where: { id: inventoryAcc.id },
            data: { balance: { decrement: oldInventoryDebit } },
          });
        }
        if (!isComp) {
          if (cgstAcc && oldCgst > 0) {
            await tx.account.update({ where: { id: cgstAcc.id }, data: { balance: { decrement: oldCgst } } });
          }
          if (sgstAcc && oldSgst > 0) {
            await tx.account.update({ where: { id: sgstAcc.id }, data: { balance: { decrement: oldSgst } } });
          }
          if (igstAcc && oldIgst > 0) {
            await tx.account.update({ where: { id: igstAcc.id }, data: { balance: { decrement: oldIgst } } });
          }
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
          const inventoryDebit = isComp ? totalAmount : totalTaxable;
          await tx.account.update({
            where: { id: inventoryAcc.id },
            data: { balance: { increment: inventoryDebit } },
          });
        }
        if (!isComp) {
          if (cgstAcc && cgstAmount > 0) {
            await tx.account.update({ where: { id: cgstAcc.id }, data: { balance: { increment: cgstAmount } } });
          }
          if (sgstAcc && sgstAmount > 0) {
            await tx.account.update({ where: { id: sgstAcc.id }, data: { balance: { increment: sgstAmount } } });
          }
          if (igstAcc && igstAmount > 0) {
            await tx.account.update({ where: { id: igstAcc.id }, data: { balance: { increment: igstAmount } } });
          }
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
    }, { maxWait: 20000, timeout: 80000 });

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

// DELETE /api/purchase/[id] — SOFT CANCEL (world standard: never hard-delete financial records)
// Marks bill as CANCELLED, reverses stock, reverses ledger journal entries.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason") || "Cancelled by user";

    const bill = await prisma.purchaseBill.findUnique({
      where: { id: params.id, tenantId },
      include: { items: true },
    });
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    if (bill.isCancelled) return NextResponse.json({ error: "Purchase bill is already cancelled." }, { status: 400 });

    await prisma.$transaction(async (tx) => {

      // ── 1. Mark bill as CANCELLED ──────────────────────────────────────────
      await tx.purchaseBill.update({
        where: { id: bill.id },
        data: {
          isCancelled:        true,
          cancelledAt:        new Date(),
          cancellationReason: reason,
          dueAmount:          0,
        },
      });

      // ── 2. Reverse stock quantities (decrement back what was added) ─────────
      for (const item of bill.items) {
        if (!item.productId) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.baseQuantity } },
        });

        const batch = await tx.batch.findFirst({
          where: { tenantId, productId: item.productId, batchNumber: item.batchNumber || "" },
        });
        if (batch) {
          await tx.batch.update({
            where: { id: batch.id },
            data: { currentStock: { decrement: item.baseQuantity } },
          });
        }

        if (bill.warehouseId) {
          const whStock = await tx.warehouseStock.findUnique({
            where: { warehouseId_productId: { warehouseId: bill.warehouseId, productId: item.productId } },
          });
          if (whStock) {
            await tx.warehouseStock.update({
              where: { id: whStock.id },
              data: { quantity: { decrement: item.baseQuantity } },
            });
          }
        }
      }

      // Delete purchase stock logs
      await tx.stockLog.deleteMany({
        where: { tenantId, referenceId: bill.billNumber, type: "PURCHASE_IN" },
      });

      // ── 3. Reverse account balances & mark journal entries as CANCELLED ─────
      const journals = await tx.journalEntry.findMany({
        where: { tenantId, referenceNo: bill.billNumber },
        include: { lines: { include: { account: true } } },
      });

      for (const journal of journals) {
        for (const line of journal.lines) {
          const acc = line.account;
          if (!acc) continue;
          const isAssetExp = acc.classification === "ASSET" || acc.classification === "EXPENSE";
          const originalDelta = isAssetExp
            ? Number(line.debit) - Number(line.credit)
            : Number(line.credit) - Number(line.debit);
          await tx.account.update({
            where: { id: line.accountId },
            data: { balance: { decrement: originalDelta } },
          });
        }
        // Mark as cancelled — keep in DB for audit trail
        await tx.journalEntry.update({
          where: { id: journal.id },
          data: { narration: `[CANCELLED] ${journal.narration}` },
        });
      }

      // ── 4. Audit log ───────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          tenantId,
          userId:     session.userId,
          userName:   session.name || "Manager",
          action:     AuditAction.DELETE,
          entityType: "PURCHASE_BILL",
          entityId:   bill.id,
          details: {
            billNumber:         bill.billNumber,
            totalAmount:        bill.totalAmount,
            cancellationReason: reason,
            type:               "SOFT_CANCEL",
          },
        },
      });

    }, { maxWait: 20000, timeout: 80000 });

    return NextResponse.json({
      success: true,
      message: `Purchase bill #${bill.billNumber} cancelled. Stock reversed & ledger corrected.`,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.name === "AuthError")      return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Error cancelling purchase bill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
