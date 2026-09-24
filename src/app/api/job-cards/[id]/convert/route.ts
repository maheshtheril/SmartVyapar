import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { generateNextInvoiceNumber } from "@/lib/invoice-sequence";
import { JobCardStatus } from "@prisma/client";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(request);

    const jobCard = await prisma.jobCard.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { 
        items: { include: { product: true } }, 
        vehicle: { include: { customer: true } },
        tenant: true
      }
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    if (jobCard.status === "INVOICED" || jobCard.invoiceId) {
      return NextResponse.json({ error: "Job card is already invoiced", invoiceId: jobCard.invoiceId }, { status: 400 });
    }

    // P0: Enforce that we can only convert from READY_FOR_DELIVERY or DELIVERED or COMPLETED
    if (jobCard.status !== JobCardStatus.READY_FOR_DELIVERY && jobCard.status !== JobCardStatus.DELIVERED && jobCard.status !== JobCardStatus.COMPLETED) {
       return NextResponse.json({ error: `Cannot invoice Job Card from status ${jobCard.status}. Must be READY_FOR_DELIVERY or DELIVERED.` }, { status: 400 });
    }

    const { paymentMethod, amountPaid } = await request.json();

    const isInterState = Boolean(jobCard.vehicle.customer.stateCode && jobCard.vehicle.customer.stateCode !== jobCard.tenant.stateCode);

    let subtotal = 0;
    let totalTaxAmount = 0;

    const itemsToCreate = jobCard.items.map((item) => {
      const product = item.product;
      const gstRate = product ? Number(product.gstRate) : 18;
      const hsnCode = product ? product.hsnCode : (item.itemType === 'LABOUR' ? "998714" : "8708");

      if (item.itemType !== 'LABOUR' && !product) {
        throw new Error(`Product missing for Job Card item ${item.name}`);
      }
      if (!hsnCode) {
        throw new Error(`HSN code missing for item ${item.name}`);
      }

      const lineVal = Number(item.lineTotal);
      const tax = lineVal * (gstRate / 100);
      
      subtotal += lineVal;
      totalTaxAmount += tax;

      return {
        productId: item.productId,
        productName: item.name,
        hsnCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gstRate,
        cgstAmount: isInterState ? 0 : tax / 2,
        sgstAmount: isInterState ? 0 : tax / 2,
        igstAmount: isInterState ? tax : 0,
        lineTotal: lineVal + tax
      };
    });

    const totalAmount = subtotal + totalTaxAmount;
    
    // Default to unpaid if not fully provided
      const paid = amountPaid ? Number(amountPaid) : 0;
      
      if (!Number.isFinite(paid) || paid < 0) {
        throw new Error("Paid amount cannot be negative");
      }
      if (paid > totalAmount) {
        throw new Error("Paid amount cannot exceed the total invoice amount");
      }
      
      const dueAmount = totalAmount - paid;
      const paymentStatus = dueAmount <= 0 ? "PAID" : dueAmount < totalAmount ? "PARTIAL" : "UNPAID";

    const result = await prisma.$transaction(async (tx) => {
      // Conditionally lock the job card
      const lockedJobCard = await tx.jobCard.updateMany({
        where: { id: jobCard.id, tenantId: session.tenantId, status: jobCard.status },
        data: { status: JobCardStatus.INVOICED }
      });

      if (lockedJobCard.count === 0) {
        throw new Error("Job card status was modified by another request. Please try again.");
      }

      // Generate atomic invoice number
      const seqResult = await generateNextInvoiceNumber(tx, { tenantId: session.tenantId, prefix: "INV" });
      const invoiceNumber = seqResult.invoiceNumber;

      // 1. Create the Invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId: session.tenantId,
          invoiceNumber,
          customerId: jobCard.customerId,
          customerName: jobCard.vehicle.customer.name,
          customerPhone: jobCard.vehicle.customer.phone || "0000000000",
          customerGstin: jobCard.vehicle.customer.gstin,
          customerStateCode: jobCard.vehicle.customer.stateCode || "32",
            isInterState,
          subtotal,
          cgstAmount: isInterState ? 0 : totalTaxAmount / 2,
          sgstAmount: isInterState ? 0 : totalTaxAmount / 2,
          igstAmount: isInterState ? totalTaxAmount : 0,
          totalTax: totalTaxAmount,
          totalAmount,
          paidAmount: paid,
          dueAmount,
          paymentStatus,
          paymentMode: paymentMethod || "CASH",
          notes: `Generated from Job Card: ${jobCard.jobCardNumber} (Vehicle: ${jobCard.vehicle.licensePlate})`,
          items: {
            create: itemsToCreate
          }
        }
      });

      // 2. Link Invoice ID
      await tx.jobCard.update({
        where: { id: jobCard.id },
        data: {
          invoiceId: invoice.id
        }
      });

      // 3. Update customer outstanding balance if unpaid
      if (dueAmount > 0) {
        await tx.customer.update({
          where: { id: jobCard.customerId },
          data: { outstandingBalance: { increment: dueAmount } }
        });
      }

      // Note: We already deducted stock in the JobCard creation POST, so we don't deduct it again here.

      return invoice;
    });

    return NextResponse.json({ success: true, invoiceId: result.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



