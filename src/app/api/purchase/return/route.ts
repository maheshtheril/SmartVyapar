import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { StockLogType, AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { GstCalculator } from "@/lib/gst";

export const dynamic = "force-dynamic";

/**
 * GET /api/purchase/return
 * Fetches all statutory Debit Notes / Purchase Returns with pagination, supplier filter, and date range.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const skip = (page - 1) * limit;

    const whereClause: any = { tenantId };

    if (search.trim()) {
      whereClause.OR = [
        { debitNoteNumber: { contains: search, mode: "insensitive" } },
        { supplierName: { contains: search, mode: "insensitive" } },
        { originalBillNumber: { contains: search, mode: "insensitive" } },
        { supplierGstin: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, debitNotes] = await Promise.all([
      prisma.debitNote.count({ where: whereClause }),
      prisma.debitNote.findMany({
        where: whereClause,
        include: {
          items: true,
          purchaseBill: {
            select: {
              id: true,
              billNumber: true,
              grnNumber: true,
              billDate: true,
              totalAmount: true,
              dueAmount: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: { debitNoteDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: debitNotes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching debit notes:", error);
    return NextResponse.json({ error: error.message || "Failed to load debit notes" }, { status: 500 });
  }
}

/**
 * POST /api/purchase/return
 * Records a Statutory Purchase Return / Supplier Debit Note (GST Rule 34 & Section 34(1)):
 * 1. Atomically deducts stock from current inventory.
 * 2. Deducts batch and warehouse stock if applicable.
 * 3. Records immutable StockLog.
 * 4. Creates first-class persistent DebitNote and DebitNoteItem entities.
 * 5. Reverses double-entry ledger (Debits AP 2000, Credits Inventory 1300/1200 & Input Taxes 1410/1420/1430).
 * 6. Adjusts PurchaseBill outstanding due amount.
 * 7. Records statutory MCA/GST audit log.
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
      supplierStateCode: rawSupplierStateCode,
      purchaseBillId,
      originalBillNumber,
      originalBillDate,
      items,
      reason = "DEFECTIVE",
      notes,
      settlementMode = "ACCOUNTS_PAYABLE_CREDIT",
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
    const returnCount = await prisma.debitNote.count({
      where: { tenantId },
    });
    const debitNoteNumber = `DN-${returnYear}-${String(returnCount + 1).padStart(4, "0")}`;

    const effectiveSupplierState =
      rawSupplierStateCode ||
      (supplierGstin && supplierGstin.length >= 2 ? supplierGstin.substring(0, 2) : tenant.stateCode);

    const isInterState = effectiveSupplierState !== tenant.stateCode;

    const result = await prisma.$transaction(
      async (tx) => {
        // Find existing purchase bill if referenced
        let matchedBill: any = null;
        if (purchaseBillId) {
          matchedBill = await tx.purchaseBill.findUnique({
            where: { id: purchaseBillId },
          });
        } else if (originalBillNumber) {
          matchedBill = await tx.purchaseBill.findFirst({
            where: {
              tenantId,
              billNumber: originalBillNumber,
              supplierName: { equals: supplierName, mode: "insensitive" },
            },
          });
        }

        let subtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const processedItems = [];
        const debitNoteItemsToCreate = [];

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

          const gstRateNum = Number(item.gstRate !== undefined ? item.gstRate : product.gstRate);

          const tax = GstCalculator.calculate(
            lineTaxable,
            gstRateNum,
            tenant.stateCode,
            effectiveSupplierState,
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
              note: `Purchase Return: -${returnQty} ${product.baseUnit} returned to ${supplierName} (Debit Note #${debitNoteNumber}, Ref Bill #${originalBillNumber || matchedBill?.billNumber || "N/A"}) - ${reason}`,
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

          debitNoteItemsToCreate.push({
            productId: product.id,
            productName: product.name,
            batchId: item.batchId || null,
            batchNumber: item.batchNumber || null,
            hsnCode: product.hsnCode || null,
            unit: product.baseUnit || "PCS",
            quantity: returnQty,
            costRate,
            taxableValue: lineTaxable,
            gstRate: gstRateNum,
            cgstAmount: tax.cgstAmount,
            sgstAmount: tax.sgstAmount,
            igstAmount: tax.igstAmount,
            taxAmount: tax.totalTax,
            totalAmount: tax.totalAmount,
          });
        }

        const totalTax = totalCgst + totalSgst + totalIgst;
        const totalDebitNoteAmount = subtotal + totalTax;

        // 4. CREATE FIRST-CLASS DEBIT NOTE RECORD
        const debitNote = await tx.debitNote.create({
          data: {
            tenantId,
            debitNoteNumber,
            debitNoteDate: new Date(),
            purchaseBillId: matchedBill?.id || purchaseBillId || null,
            originalBillNumber: originalBillNumber || matchedBill?.billNumber || null,
            originalBillDate: originalBillDate
              ? new Date(originalBillDate)
              : matchedBill?.billDate || null,
            supplierId: matchedBill?.supplierId || null,
            supplierName,
            supplierGstin: supplierGstin || matchedBill?.supplierGstin || null,
            supplierPhone: supplierPhone || null,
            supplierStateCode: effectiveSupplierState,
            isInterState,
            reason,
            remarks: notes || null,
            subtotal,
            cgstAmount: totalCgst,
            sgstAmount: totalSgst,
            igstAmount: totalIgst,
            totalTax,
            totalAmount: totalDebitNoteAmount,
            settlementMode,
            items: {
              create: debitNoteItemsToCreate,
            },
          },
          include: {
            items: true,
          },
        });

        // 5. UPDATE PURCHASE BILL OUTSTANDING BALANCE
        if (matchedBill) {
          const currentDue = Number(matchedBill.dueAmount || matchedBill.totalAmount || 0);
          const newDue = Math.max(0, currentDue - totalDebitNoteAmount);
          const currentPaid = Number(matchedBill.paidAmount || 0);
          const newPaymentStatus =
            newDue === 0 ? "PAID" : currentPaid > 0 ? "PARTIAL" : "UNPAID";

          await tx.purchaseBill.update({
            where: { id: matchedBill.id },
            data: {
              dueAmount: newDue,
              paymentStatus: newPaymentStatus,
            },
          });
        }

        // 6. DOUBLE-ENTRY LEDGER REVERSAL:
        // Debit: Accounts Payable (2000) - reduces liability to supplier
        // Credit: Merchandise Inventory Asset (1300 / 1200) - reduces stock balance
        // Credit: Input CGST (1410), Input SGST (1420), Input IGST (1430)
        const accounts = await tx.account.findMany({
          where: {
            tenantId,
            code: { in: ["2000", "1300", "1200", "1410", "1420", "1430", "1000", "1010"] },
          },
        });
        const accMap = new Map(accounts.map((a) => [a.code, a]));

        // Accounts Payable reduction
        const payablesAcc = accMap.get("2000");
        if (payablesAcc) {
          await tx.account.update({
            where: { id: payablesAcc.id },
            data: { balance: { decrement: totalDebitNoteAmount } },
          });
        }

        // Inventory Asset reduction (prefer 1300 Merchandise Inventory Asset, fallback to 1200)
        const inventoryAcc = accMap.get("1300") || accMap.get("1200");
        if (inventoryAcc) {
          await tx.account.update({
            where: { id: inventoryAcc.id },
            data: { balance: { decrement: subtotal } },
          });
        }

        // GST Input Tax Credit Reversals
        if (totalCgst > 0) {
          const cgstAcc = accMap.get("1410");
          if (cgstAcc) {
            await tx.account.update({
              where: { id: cgstAcc.id },
              data: { balance: { decrement: totalCgst } },
            });
          }
        }

        if (totalSgst > 0) {
          const sgstAcc = accMap.get("1420");
          if (sgstAcc) {
            await tx.account.update({
              where: { id: sgstAcc.id },
              data: { balance: { decrement: totalSgst } },
            });
          }
        }

        if (totalIgst > 0) {
          const igstAcc = accMap.get("1430");
          if (igstAcc) {
            await tx.account.update({
              where: { id: igstAcc.id },
              data: { balance: { decrement: totalIgst } },
            });
          }
        }

        // Handle immediate Cash or Bank Refund settlement
        if (settlementMode === "CASH_REFUND") {
          const cashAcc = accMap.get("1000");
          if (cashAcc) {
            await tx.account.update({
              where: { id: cashAcc.id },
              data: { balance: { increment: totalDebitNoteAmount } },
            });
          }
        } else if (settlementMode === "BANK_REFUND") {
          const bankAcc = accMap.get("1010");
          if (bankAcc) {
            await tx.account.update({
              where: { id: bankAcc.id },
              data: { balance: { increment: totalDebitNoteAmount } },
            });
          }
        }

        // 7. RECORD STATUTORY MCA / GST AUDIT LOG
        await recordAuditLog(
          {
            tenantId,
            userId: session.userId,
            userName: session.name,
            action: AuditAction.CREATE,
            entityType: "DEBIT_NOTE",
            entityId: debitNoteNumber,
            details: {
              debitNoteId: debitNote.id,
              debitNoteNumber,
              supplierName,
              originalBillNumber: originalBillNumber || matchedBill?.billNumber,
              totalDebitNoteAmount,
              subtotal,
              totalTax,
              reason,
              settlementMode,
              itemsCount: items.length,
            },
          },
          tx
        );

        return {
          id: debitNote.id,
          debitNoteNumber,
          subtotal,
          totalTax,
          totalDebitNoteAmount,
          settlementMode,
          items: processedItems,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Statutory Purchase Return recorded under Debit Note #${result.debitNoteNumber}`,
      data: result,
    });
  } catch (error: any) {
    console.error("Error processing purchase return:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
