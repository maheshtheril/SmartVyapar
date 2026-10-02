import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { GstCalculator } from "@/lib/gst";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/invoices/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(req);
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id, tenantId: session.tenantId },
      include: { items: true },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/invoices/[id] — Edit sales invoice: recalculate totals, reverse old ledger, post new ledger
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { customerName, customerPhone, customerGstin, customerStateCode, paymentStatus, paymentMode, paidAmount, notes, items } = body;

    const existing = await prisma.invoice.findUnique({
      where: { id: params.id, tenantId },
      include: { items: true },
    });
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Old totals for ledger reversal
    const oldSubtotal   = Number(existing.subtotal);
    const oldCgst       = Number(existing.cgstAmount);
    const oldSgst       = Number(existing.sgstAmount);
    const oldIgst       = Number(existing.igstAmount);
    const oldTotal      = Number(existing.totalAmount);
    const oldDue        = Number(existing.dueAmount);
    const oldPaid       = Number(existing.paidAmount);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const resolvedStateCode = customerStateCode ?? existing.customerStateCode;
    const isInterState = resolvedStateCode !== tenant?.stateCode;

    // Recalculate from updated items
    let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

    const updatedItems = (items || existing.items).map((item: any) => {
      const qty       = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const lineTaxable = unitPrice * qty;
      subtotal += lineTaxable;

      const tax = GstCalculator.calculate(
        lineTaxable,
        Number(item.gstRate || 0),
        tenant?.stateCode || "",
        resolvedStateCode || "",
        tenant?.isComposition || false
      );
      totalCgst += tax.cgstAmount;
      totalSgst += tax.sgstAmount;
      totalIgst += tax.igstAmount;

      return {
        ...item,
        cgstAmount: tax.cgstAmount,
        sgstAmount: tax.sgstAmount,
        igstAmount: tax.igstAmount,
        lineTotal:  tax.totalAmount,
      };
    });

    const totalTax    = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
    const totalAmount = Math.round((subtotal + totalTax) * 100) / 100;
    const newPaid     = paidAmount !== undefined ? Number(paidAmount) : oldPaid;
    const dueAmount   = Math.max(0, Math.round((totalAmount - newPaid) * 100) / 100);

    const updatedInvoice = await prisma.$transaction(async (tx) => {

      // ── 1. Update invoice header & totals ─────────────────────────────────
      const invoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          customerName:      customerName      ?? existing.customerName,
          customerPhone:     customerPhone     ?? existing.customerPhone,
          customerGstin:     customerGstin     ?? existing.customerGstin,
          customerStateCode: resolvedStateCode,
          isInterState,
          subtotal,
          cgstAmount:   totalCgst,
          sgstAmount:   totalSgst,
          igstAmount:   totalIgst,
          totalTax,
          totalAmount,
          paidAmount:   newPaid,
          dueAmount,
          paymentStatus: paymentStatus ?? existing.paymentStatus,
          paymentMode:   paymentMode   ?? existing.paymentMode,
          notes:         notes         ?? existing.notes,
        },
      });

      // ── 2. Update each invoice line item pricing ───────────────────────────
      for (const item of updatedItems) {
        if (item.id) {
          await tx.invoiceItem.update({
            where: { id: item.id },
            data: {
              unitPrice:   Number(item.unitPrice   || 0),
              quantity:    Number(item.quantity    || 1),
              gstRate:     Number(item.gstRate     || 0),
              cgstAmount:  item.cgstAmount,
              sgstAmount:  item.sgstAmount,
              igstAmount:  item.igstAmount,
              lineTotal:   item.lineTotal,
            },
          });
        }
      }

      // ── 3. Reverse old customer outstanding balance ────────────────────────
      if (oldDue !== dueAmount && existing.customerId) {
        const balanceDiff = dueAmount - oldDue;
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { outstandingBalance: { increment: balanceDiff } },
        });
      }

      // ── 4. Reverse old ledger entries (find and reverse journal entry) ─────
      // Find original journal entry for this invoice
      const oldJournal = await tx.journalEntry.findFirst({
        where: { tenantId, referenceNo: existing.invoiceNumber },
        include: { lines: { include: { account: true } } },
        orderBy: { createdAt: "asc" },
      });

      if (oldJournal) {
        // Reverse each line: debit ↔ credit
        for (const line of oldJournal.lines) {
          const delta = Number(line.debit) - Number(line.credit); // positive = was a debit
          await tx.account.update({
            where: { id: line.accountId },
            data: { balance: { decrement: delta } }, // undo original impact
          });
        }
        // Mark old entry as reversed
        await tx.journalEntry.update({
          where: { id: oldJournal.id },
          data: { narration: `[REVERSED] ${oldJournal.narration}` },
        });
      }

      // ── 5. Post new ledger entry ───────────────────────────────────────────
      const { postInvoiceJournalEntry } = await import("@/lib/accounting-mapper");
      await postInvoiceJournalEntry(tx, tenantId, {
        ...invoice,
        invoiceDate: existing.invoiceDate,
      });

      // ── 6. Audit log ───────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          tenantId,
          userId:     session.userId,
          userName:   session.name || "Manager",
          action:     AuditAction.UPDATE,
          entityType: "INVOICE",
          entityId:   invoice.id,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            oldTotal,
            newTotal: totalAmount,
            ledgerReversed: true,
          },
        },
      });

      return invoice;
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      message: "Invoice updated & ledger re-posted successfully",
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


// DELETE /api/invoices/[id] - Completely and securely deletes an invoice
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id, tenantId },
      include: { items: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // Security Checks
    if (invoice.isReconciled) {
      return NextResponse.json({ error: 'Cannot delete an invoice that has been reconciled in a closed Cash Drawer shift. Issue a Credit Note instead.' }, { status: 400 });
    }
    if (invoice.irn) {
      return NextResponse.json({ error: 'Cannot delete an invoice with an active E-Invoice IRN. Cancel the E-Invoice on the portal first.' }, { status: 400 });
    }
    if (invoice.ewayBillNo) {
      return NextResponse.json({ error: 'Cannot delete an invoice with an active E-Way Bill. Cancel the E-Way bill first.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Reverse Customer Balance
      if (invoice.customerId && Number(invoice.dueAmount) > 0) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { outstandingBalance: { decrement: invoice.dueAmount } },
        });
      }

      // 2. Restore Stock Quantities
      for (const item of invoice.items) {
        if (!item.productId) continue;
        
        // Increment Product Stock
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.baseQuantity } },
        });

        // Increment Batch Stock
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { currentStock: { increment: item.baseQuantity } },
          });
        }

        // We assume default warehouse for now (as invoices don't track WH explicitly in basic mode)
        const whStock = await tx.warehouseStock.findFirst({
          where: { tenantId, productId: item.productId }
        });
        if (whStock) {
          await tx.warehouseStock.update({
            where: { id: whStock.id },
            data: { quantity: { increment: item.baseQuantity } },
          });
        }

        // Delete Stock Logs for this sale
        await tx.stockLog.deleteMany({
          where: { tenantId, referenceId: invoice.invoiceNumber, type: 'SALE' }
        });
      }

      // 3. Reverse Ledger (Journal Entries)
      const oldJournals = await tx.journalEntry.findMany({
        where: { tenantId, referenceNo: invoice.invoiceNumber },
        include: { lines: true }
      });

      for (const journal of oldJournals) {
        for (const line of journal.lines) {
          const delta = Number(line.debit) - Number(line.credit);
          await tx.account.update({
            where: { id: line.accountId },
            data: { balance: { decrement: delta } },
          });
        }
        await tx.journalEntry.delete({ where: { id: journal.id } });
      }

      // 4. Delete Items and Invoice
      await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
      await tx.invoice.delete({ where: { id: invoice.id } });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          userName: session.name || 'Manager',
          action: AuditAction.DELETE,
          entityType: 'INVOICE',
          entityId: invoice.id,
          details: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount },
        }
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ success: true, message: 'Invoice successfully deleted.' });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
