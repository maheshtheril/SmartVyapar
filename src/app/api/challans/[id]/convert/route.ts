import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { generateNextInvoiceNumber } from "@/lib/invoice-sequence";
import { PaymentStatus, PaymentMode, StockLogType, AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

// POST /api/challans/[id]/convert - Convert Delivery Challan into a Tax Invoice
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const challanId = params.id;

    const challan = await prisma.deliveryChallan.findFirst({
      where: { id: challanId, tenantId },
      include: { items: true },
    });

    if (!challan) {
      return NextResponse.json({ error: "Delivery Challan not found" }, { status: 404 });
    }

    if (challan.status === "CONVERTED_TO_INVOICE") {
      return NextResponse.json(
        { error: "This Delivery Challan has already been converted to an invoice" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Create Invoice with line items inside atomic transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Generate atomic Invoice Number inside tx
      const seqResult = await generateNextInvoiceNumber(tx, { tenantId });
      const invoiceNumber = seqResult.invoiceNumber;

      let customerId: string | null = null;
      if (challan.recipientPhone) {
        const existingCustomer = await tx.customer.findFirst({
          where: { tenantId, phone: challan.recipientPhone },
        });
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const createdCustomer = await tx.customer.create({
            data: {
              tenantId,
              name: challan.recipientName,
              phone: challan.recipientPhone,
              gstin: challan.recipientGstin,
              stateCode: challan.recipientStateCode,
              address: challan.recipientAddress,
            },
          });
          customerId = createdCustomer.id;
        }
      }

      const newInv = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          invoiceDate: new Date(),
          customerId,
          customerName: challan.recipientName,
          customerPhone: challan.recipientPhone || "Counter Customer",
          customerGstin: challan.recipientGstin,
          customerStateCode: challan.recipientStateCode,
          isInterState: challan.isInterState,
          subtotal: challan.subtotal,
          cgstAmount: challan.cgstAmount,
          sgstAmount: challan.sgstAmount,
          igstAmount: challan.igstAmount,
          totalTax: challan.totalTax,
          totalAmount: challan.totalAmount,
          paidAmount: 0,
          dueAmount: challan.totalAmount,
          paymentStatus: PaymentStatus.UNPAID,
          paymentMode: PaymentMode.CREDIT,
          notes: `Converted from Delivery Challan ${challan.challanNumber}`,
          vehicleNo: challan.vehicleNo,
          transporterName: challan.transporterName,
          items: {
            create: challan.items.map((item) => ({
              productId: item.productId || "", // fallback
              productName: item.productName,
              hsnCode: item.hsnCode,
              unitSold: item.unit,
              quantity: item.quantity,
              conversionFactor: 1.0,
              baseQuantity: item.quantity,
              unitPrice: item.unitPrice,
              gstRate: item.gstRate,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      // Update Delivery Challan state
      await tx.deliveryChallan.update({
        where: { id: challan.id },
        data: {
          status: "CONVERTED_TO_INVOICE",
          convertedInvoiceId: newInv.id,
          convertedAt: new Date(),
        },
      });

      return newInv;
    }, DEFAULT_TX_OPTIONS);

    // Record audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.CREATE,
      entityType: "INVOICE",
      entityId: invoice.invoiceNumber,
      details: {
        convertedFromChallan: challan.challanNumber,
        totalAmount: invoice.totalAmount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Delivery Challan ${challan.challanNumber} converted to Invoice ${invoice.invoiceNumber} successfully`,
      invoice,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Challan conversion error:", error);
    return NextResponse.json({ error: error.message || "Failed to convert challan" }, { status: 500 });
  }
}
