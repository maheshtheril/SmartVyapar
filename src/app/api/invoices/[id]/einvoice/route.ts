import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { CancelEinvoiceSchema, ManualEinvoiceSchema } from "@/lib/schemas/einvoice";
import {
  registerEinvoice,
  generateNicEinvoicePayload,
  validateCancelEligibility,
} from "@/lib/einvoice";
import { AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

interface Params {
  params: { id: string };
}

// GET /api/invoices/[id]/einvoice - Retrieve E-Invoice status and official NIC INV-01 JSON
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const invoiceId = params.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const nicPayload = generateNicEinvoicePayload(invoice, tenant);
    const cancelEligibility = validateCancelEligibility(invoice.ackDate);

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerGstin: invoice.customerGstin,
        totalAmount: invoice.totalAmount,
        irn: invoice.irn,
        ackNo: invoice.ackNo,
        ackDate: invoice.ackDate,
        signedQrCode: invoice.signedQrCode,
        einvoiceStatus: invoice.einvoiceStatus || "PENDING",
        einvoiceCancelReason: invoice.einvoiceCancelReason,
        einvoiceCancelDate: invoice.einvoiceCancelDate,
      },
      nicPayload,
      cancelEligibility,
    });
  } catch (error: any) {
    console.error("Error fetching E-Invoice details:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/invoices/[id]/einvoice - Generate & Register IRN with IRP
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const invoiceId = params.id;

    // Optional manual payload body if user imports pre-generated IRN
    let manualData: any = null;
    try {
      const body = await req.json();
      if (body && Object.keys(body).length > 0) {
        const manualValidation = validateBody(ManualEinvoiceSchema, body);
        if (manualValidation.success) {
          manualData = manualValidation.data;
        }
      }
    } catch {
      // Empty body is acceptable for automatic generation
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.einvoiceStatus === "GENERATED" && invoice.irn) {
      return NextResponse.json(
        { error: "E-Invoice already generated for this invoice. IRN: " + invoice.irn },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let irn = "";
    let ackNo = "";
    let ackDate = new Date();
    let signedQrCode = "";
    let nicPayload = null;

    if (manualData) {
      irn = manualData.irn;
      ackNo = manualData.ackNo;
      ackDate = new Date(manualData.ackDate);
      signedQrCode = manualData.signedQrCode || "";
      nicPayload = generateNicEinvoicePayload(invoice, tenant);
    } else {
      const regResult = await registerEinvoice(invoice, tenant);
      irn = regResult.irn;
      ackNo = regResult.ackNo;
      ackDate = regResult.ackDate;
      signedQrCode = regResult.signedQrCode;
      nicPayload = regResult.nicPayload;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        irn,
        ackNo,
        ackDate,
        signedQrCode,
        einvoiceStatus: "GENERATED",
        einvoiceCancelReason: null,
        einvoiceCancelDate: null,
      },
    });

    // Record statutory MCA/GST audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.EINVOICE_GENERATED,
      entityType: "INVOICE",
      entityId: updatedInvoice.invoiceNumber,
      details: {
        invoiceId: updatedInvoice.id,
        irn,
        ackNo,
        ackDate: ackDate.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "E-Invoice IRN generated and registered successfully",
      invoice: updatedInvoice,
      nicPayload,
    });
  } catch (error: any) {
    console.error("Error generating E-Invoice:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]/einvoice - Cancel active IRN (within statutory 24-hr window)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const invoiceId = params.id;

    const body = await req.json();
    const validation = validateBody(CancelEinvoiceSchema, body);
    if (!validation.success) {
      return validation.response;
    }
    const { cancelReason, cancelRemarks } = validation.data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.einvoiceStatus !== "GENERATED" || !invoice.irn) {
      return NextResponse.json(
        { error: "No active E-Invoice IRN to cancel for this invoice" },
        { status: 400 }
      );
    }

    // Check statutory 24-hour limit
    const eligibility = validateCancelEligibility(invoice.ackDate);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.message },
        { status: 400 }
      );
    }

    const cancelReasonsMap: Record<string, string> = {
      "1": "Duplicate",
      "2": "Data entry mistake",
      "3": "Order cancelled",
      "4": "Others",
    };

    const formattedReason = `${cancelReasonsMap[cancelReason] || "Others"}${
      cancelRemarks ? `: ${cancelRemarks}` : ""
    }`;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        einvoiceStatus: "CANCELLED",
        einvoiceCancelReason: formattedReason,
        einvoiceCancelDate: new Date(),
      },
    });

    // Record statutory MCA/GST audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.EINVOICE_CANCELLED,
      entityType: "INVOICE",
      entityId: updatedInvoice.invoiceNumber,
      details: {
        invoiceId: updatedInvoice.id,
        irn: invoice.irn,
        ackNo: invoice.ackNo,
        cancelReason: formattedReason,
      },
    });

    return NextResponse.json({
      success: true,
      message: "E-Invoice IRN cancelled successfully",
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error("Error cancelling E-Invoice:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
