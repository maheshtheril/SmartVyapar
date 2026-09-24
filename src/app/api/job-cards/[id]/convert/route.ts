import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(request);

    const jobCard = await prisma.jobCard.findUnique({
      where: { id: params.id, tenantId: session.tenantId },
      include: { items: true, vehicle: { include: { customer: true } } }
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    if (jobCard.status === "INVOICED" && jobCard.invoiceId) {
      return NextResponse.json({ error: "Job card is already invoiced", invoiceId: jobCard.invoiceId }, { status: 400 });
    }

    const { paymentMethod, amountPaid } = await request.json();

    // Generate Invoice Number
    const count = await prisma.invoice.count({ where: { tenantId: session.tenantId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Calculate totals (Simplification: assuming 18% IGST or CGST/SGST total tax for parts/labour. 
    // In reality, this should calculate from product master).
    const subtotal = jobCard.estimatedTotal;
    const taxAmount = Number(subtotal) * 0.18; // 18% dummy tax calculation
    const totalAmount = Number(subtotal) + taxAmount;
    
    // Default to unpaid if not fully provided
    const paid = amountPaid ? Number(amountPaid) : 0;
    const dueAmount = totalAmount - paid;
    const status = dueAmount <= 0 ? "PAID" : dueAmount < totalAmount ? "PARTIAL" : "UNPAID";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId: session.tenantId,
          invoiceNumber,
          customerId: jobCard.customerId,
          customerName: jobCard.vehicle.customer.name,
          customerGstin: jobCard.vehicle.customer.gstin,
          customerStateCode: jobCard.vehicle.customer.stateCode || "32",
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: paid,
          dueAmount,
          status,
          paymentMethod: paymentMethod || "CASH",
          notes: `Generated from Job Card: ${jobCard.jobCardNumber} (Vehicle: ${jobCard.vehicle.licensePlate})`,
          items: {
            create: jobCard.items.map((item) => {
              const tax = Number(item.lineTotal) * 0.09;
              return {
                productId: item.productId,
                productName: item.name,
                hsnCode: item.itemType === 'LABOUR' ? "998714" : "8708", // basic fallback
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                gstRate: 18,
                cgstAmount: tax,
                sgstAmount: tax,
                igstAmount: 0,
                lineTotal: Number(item.lineTotal) * 1.18
              };
            })
          }
        }
      });

      // 2. Mark Job Card as INVOICED
      await tx.jobCard.update({
        where: { id: jobCard.id },
        data: {
          status: "INVOICED",
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
