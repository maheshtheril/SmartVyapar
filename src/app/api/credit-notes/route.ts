import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { CreateCreditNoteSchema } from "@/lib/schemas/credit-note";
import { generateNextInvoiceNumber } from "@/lib/invoice-sequence";
import { GstCalculator } from "@/lib/gst";
import { StockLogType, AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

// GET /api/credit-notes - List Credit Notes for authenticated tenant
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const invoiceId = searchParams.get("invoiceId");
    const reason = searchParams.get("reason");

    const whereClause: any = { tenantId };

    if (invoiceId) {
      whereClause.invoiceId = invoiceId;
    }

    if (reason && reason !== "ALL") {
      whereClause.reason = reason;
    }

    if (query) {
      whereClause.OR = [
        { creditNoteNumber: { contains: query, mode: "insensitive" } },
        { originalInvoiceNumber: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { customerPhone: { contains: query } },
      ];
    }

    const creditNotes = await prisma.creditNote.findMany({
      where: whereClause,
      include: {
        items: true,
        customer: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            totalAmount: true,
          },
        },
      },
      orderBy: {
        creditNoteDate: "desc",
      },
    });

    const totalCredited = creditNotes.reduce(
      (sum, cn) => sum + Number(cn.totalAmount),
      0
    );
    const totalTaxReversed = creditNotes.reduce(
      (sum, cn) => sum + Number(cn.totalTax),
      0
    );

    return NextResponse.json({
      success: true,
      creditNotes,
      metrics: {
        totalCredited,
        totalTaxReversed,
        count: creditNotes.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching credit notes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/credit-notes - Issue Credit Note / Sales Return
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const validation = validateBody(CreateCreditNoteSchema, body);
    if (!validation.success) {
      return validation.response;
    }
    const data = validation.data;

    // Fetch original invoice to verify ownership & tax jurisdiction
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, tenantId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Original invoice not found or unauthorized" },
        { status: 404 }
      );
    }

    // Fetch tenant profile for state code & composition flag
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Atomic transaction: Sequence generation, Stock Restoring, Khata Adjustment, Note Creation
    const creditNote = await prisma.$transaction(async (tx) => {
      // 1. Generate sequential Credit Note Number (Rule 53 compliant)
      const { invoiceNumber: creditNoteNumber } = await generateNextInvoiceNumber(
        tx,
        {
          tenantId,
          prefix: "CN",
        }
      );

      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const processedItems = [];

      for (const item of data.items) {
        const qty = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const lineTaxable = unitPrice * qty;
        subtotal += lineTaxable;

        const conversionFactor = Number(item.conversionFactor || 1);
        const baseQty = Number((qty * conversionFactor).toFixed(3));

        // Enforce Return Quantity Boundaries
        if (!item.invoiceItemId) {
          throw new Error(`invoiceItemId is required to process return for ${item.productName}`);
        }
        
        const originalInvoiceItem = await tx.invoiceItem.findUnique({ where: { id: item.invoiceItemId }});
        if (!originalInvoiceItem) {
          throw new Error(`Original invoice item not found for ${item.productName}`);
        }

        const previousReturns = await tx.creditNoteItem.aggregate({
          where: { invoiceItemId: item.invoiceItemId },
          _sum: { quantity: true }
        });
        
        const alreadyReturned = Number(previousReturns._sum.quantity || 0);
        if (alreadyReturned + qty > Number(originalInvoiceItem.quantity)) {
          throw new Error(`Cannot return ${qty} of ${item.productName}. Only ${Number(originalInvoiceItem.quantity) - alreadyReturned} remaining to be returned on this invoice.`);
        }

        // Compute GST reversal matching the original invoice's state codes
        const tax = GstCalculator.calculate(
          lineTaxable,
          Number(item.gstRate),
          tenant.stateCode,
          invoice.customerStateCode,
          tenant.isComposition
        );

        totalCgst += tax.cgstAmount;
        totalSgst += tax.sgstAmount;
        totalIgst += tax.igstAmount;

        processedItems.push({
          productId: item.productId,
          invoiceItemId: item.invoiceItemId,
          productName: item.productName,
          hsnCode: item.hsnCode || "9983",
          unitReturned: item.unitReturned || "PCS",
          quantity: qty,
          conversionFactor,
          baseQuantity: baseQty,
          unitPrice,
          gstRate: Number(item.gstRate),
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          lineTotal: tax.totalAmount,
          restock: item.restock !== false,
        });

        // 2. Restock Inventory if requested
        if (item.restock !== false) {
          // If the original sale used a specific batch, restore it to that batch
          if (originalInvoiceItem.batchId) {
            await tx.batch.update({
              where: { id: originalInvoiceItem.batchId },
              data: { currentStock: { increment: baseQty } },
            });
          } else {
            // Otherwise restore to generic product stock
            await tx.product.update({
              where: { id: item.productId },
              data: { currentStock: { increment: baseQty } },
            });
          }

          // 3. Audit Log in stock ledger
          await tx.stockLog.create({
            data: {
              tenantId,
              productId: item.productId,
              changeQty: baseQty,
              type: StockLogType.RETURN_IN,
              referenceId: creditNoteNumber,
              note: `Sales Return: ${qty} ${item.unitReturned} (${baseQty} base units) for Invoice #${invoice.invoiceNumber}${originalInvoiceItem.batchNumber ? ` [Batch: ${originalInvoiceItem.batchNumber}]` : ''} (CN #${creditNoteNumber})`,
            },
          });
        }
      }

      const totalTax = totalCgst + totalSgst + totalIgst;
      const totalAmount = subtotal + totalTax;

      // 4. Khata Ledger Adjustment: If refunded via Credit balance and customer linked
      if (data.refundMode === "CREDIT" && invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            outstandingBalance: { decrement: totalAmount },
          },
        });
      }

      // 5. Create Credit Note record
      const createdNote = await tx.creditNote.create({
        data: {
          tenantId,
          creditNoteNumber,
          invoiceId: invoice.id,
          originalInvoiceNumber: invoice.invoiceNumber,
          originalInvoiceDate: invoice.invoiceDate,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          customerGstin: invoice.customerGstin,
          customerStateCode: invoice.customerStateCode,
          isInterState: invoice.isInterState,
          reason: data.reason,
          remarks: data.remarks || null,
          subtotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          totalTax,
          totalAmount,
          refundMode: data.refundMode,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: true,
          customer: true,
          invoice: true,
        },
      });

      // 6. Statutory Audit Trail Entry
      await recordAuditLog(
        {
          tenantId,
          userId: session.userId,
          userName: session.name,
          action: AuditAction.CREDIT_NOTE_ISSUED,
          entityType: "CREDIT_NOTE",
          entityId: creditNoteNumber,
          details: {
            creditNoteId: createdNote.id,
            originalInvoiceNumber: invoice.invoiceNumber,
            totalAmount,
            refundMode: data.refundMode,
            reason: data.reason,
            itemCount: processedItems.length,
          },
        },
        tx
      );

      // 7. Automated Double-Entry Accounting
      const { postCreditNoteJournalEntry } = await import("@/lib/accounting-mapper");
      await postCreditNoteJournalEntry(tx, tenantId, createdNote);

      return createdNote;
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json(
      {
        success: true,
        creditNote,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating credit note:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
