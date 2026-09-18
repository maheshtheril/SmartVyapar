import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { EWayBillTransportSchema } from "@/lib/schemas/eway-bill";
import { generateNicEwayBillPayload } from "@/lib/eway-bill";
import { AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

interface Params {
  params: { id: string };
}

// GET /api/invoices/[id]/eway-bill - Retrieve E-Way bill metadata & NIC JSON
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

    let nicPayload = null;
    if (invoice.transDistance) {
      nicPayload = generateNicEwayBillPayload(invoice, tenant, {
        transDistance: invoice.transDistance,
        transMode: invoice.transportMode || "1",
        transporterId: invoice.transporterId,
        transporterName: invoice.transporterName,
        transDocNo: invoice.transDocNo,
        transDocDate: invoice.transDocDate ? invoice.transDocDate.toISOString() : null,
        vehicleNo: invoice.vehicleNo,
        vehicleType: invoice.vehicleType || "R",
      });
    }

    return NextResponse.json({
      success: true,
      invoice,
      nicPayload,
    });
  } catch (error: any) {
    console.error("Error fetching E-Way Bill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/invoices/[id]/eway-bill - Save transport metadata & generate NIC JSON
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const invoiceId = params.id;

    const body = await req.json();
    const validation = validateBody(EWayBillTransportSchema, body);
    if (!validation.success) {
      return validation.response;
    }
    const data = validation.data;

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

    // Clean vehicle number
    const vehicleNo = data.vehicleNo
      ? data.vehicleNo.replace(/[\s\-_]/g, "").toUpperCase()
      : null;

    // Update transport details on Invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        transDistance: data.transDistance,
        transportMode: data.transMode,
        transporterId: data.transporterId || null,
        transporterName: data.transporterName || null,
        transDocNo: data.transDocNo || null,
        transDocDate: data.transDocDate ? new Date(data.transDocDate) : null,
        vehicleNo,
        vehicleType: data.vehicleType,
        ewayBillNo: data.ewayBillNo || undefined,
        ewayBillDate: data.ewayBillNo ? new Date() : undefined,
      },
      include: {
        items: true,
        customer: true,
      },
    });

    const nicPayload = generateNicEwayBillPayload(updatedInvoice, tenant, {
      transDistance: data.transDistance,
      transMode: data.transMode,
      transporterId: data.transporterId,
      transporterName: data.transporterName,
      transDocNo: data.transDocNo,
      transDocDate: data.transDocDate,
      vehicleNo,
      vehicleType: data.vehicleType,
    });

    // Record statutory audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.EWAY_BILL_GENERATED,
      entityType: "EWAY_BILL",
      entityId: updatedInvoice.invoiceNumber,
      details: {
        invoiceId: updatedInvoice.id,
        distanceKm: data.transDistance,
        vehicleNo,
        transporterName: data.transporterName,
        ewayBillNo: data.ewayBillNo,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Transport details updated successfully",
      invoice: updatedInvoice,
      nicPayload,
    });
  } catch (error: any) {
    console.error("Error generating E-Way Bill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/invoices/[id]/eway-bill - Save official 12-digit E-Way Bill Number
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const invoiceId = params.id;

    const { ewayBillNo } = await req.json();

    if (!ewayBillNo || !/^\d{12}$/.test(ewayBillNo.trim())) {
      return NextResponse.json(
        { error: "A valid 12-digit numeric E-Way Bill Number is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.invoice.updateMany({
      where: { id: invoiceId, tenantId },
      data: {
        ewayBillNo: ewayBillNo.trim(),
        ewayBillDate: new Date(),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Record statutory audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.UPDATE,
      entityType: "EWAY_BILL",
      entityId: ewayBillNo.trim(),
      details: {
        invoiceId,
        ewayBillNo: ewayBillNo.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "E-Way Bill Number saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving E-Way Bill Number:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
