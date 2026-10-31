import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/lab/orders - List lab orders with optional status or search query
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const where: any = {
      tenantId: session.tenantId,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { patientName: { contains: query, mode: "insensitive" } },
        { orderNumber: { contains: query, mode: "insensitive" } },
        { sampleBarcode: { contains: query, mode: "insensitive" } },
        { patientPhone: { contains: query } },
      ];
    }

    const orders = await prisma.labOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        referringDoctor: {
          select: { name: true, clinicName: true },
        },
        _count: {
          select: { results: true },
        },
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("Error in GET /api/lab/orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/lab/orders - Create a new lab order / accession
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const body = await req.json();
    const {
      patientName,
      patientAge,
      patientAgeUnit = "YEARS",
      patientGender = "MALE",
      patientPhone,
      patientEmail,
      referringDoctorId,
      referringDoctorName,
      sampleType,
      clinicalHistory,
      testIds = [],
    } = body;

    if (!patientName || !patientName.trim()) {
      return NextResponse.json({ error: "Patient name is required" }, { status: 400 });
    }

    if (!testIds.length) {
      return NextResponse.json({ error: "At least one diagnostic test must be selected" }, { status: 400 });
    }

    // Generate guaranteed collision-free order number (e.g. LAB-2610-XXXX)
    const today = new Date();
    const yearMonth = today.toISOString().slice(2, 7).replace("-", ""); // e.g. "2610"
    
    // Find the latest order with this prefix for the tenant
    const latestOrder = await prisma.labOrder.findFirst({
      where: {
        tenantId,
        orderNumber: { startsWith: `LAB-${yearMonth}-` },
      },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    let nextSeq = 1;
    if (latestOrder?.orderNumber) {
      const parts = latestOrder.orderNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    let orderNumber = `LAB-${yearMonth}-${String(nextSeq).padStart(4, "0")}`;

    // Safety check to ensure absolute uniqueness
    let existingOrder = await prisma.labOrder.findUnique({
      where: {
        tenantId_orderNumber: { tenantId, orderNumber },
      },
    });
    while (existingOrder) {
      nextSeq++;
      orderNumber = `LAB-${yearMonth}-${String(nextSeq).padStart(4, "0")}`;
      existingOrder = await prisma.labOrder.findUnique({
        where: {
          tenantId_orderNumber: { tenantId, orderNumber },
        },
      });
    }

    // Generate guaranteed unique tube sample barcode (e.g. SMP-XXXXXXX)
    let sampleBarcode = `SMP-${Math.floor(100000 + Math.random() * 900000)}`;
    let barcodeExists = await prisma.labOrder.findFirst({
      where: { tenantId, sampleBarcode },
    });
    while (barcodeExists) {
      sampleBarcode = `SMP-${Math.floor(100000 + Math.random() * 900000)}`;
      barcodeExists = await prisma.labOrder.findFirst({
        where: { tenantId, sampleBarcode },
      });
    }

    // Fetch test details
    const tests = await prisma.labTest.findMany({
      where: {
        id: { in: testIds },
        tenantId,
      },
    });

    const defaultSampleType = sampleType || tests.map(t => t.specimenType).filter(Boolean).join(", ");

    const order = await prisma.labOrder.create({
      data: {
        tenantId,
        orderNumber,
        sampleBarcode,
        patientName: patientName.trim(),
        patientAge: patientAge ? parseInt(patientAge) : null,
        patientAgeUnit,
        patientGender,
        patientPhone: patientPhone?.trim() || null,
        patientEmail: patientEmail?.trim() || null,
        referringDoctorId: referringDoctorId || null,
        referringDoctorName: referringDoctorName?.trim() || null,
        sampleType: defaultSampleType,
        clinicalHistory: clinicalHistory?.trim() || null,
        status: "SAMPLE_PENDING",
        items: {
          create: tests.map((t) => ({
            testId: t.id,
            testName: t.name,
            department: t.department,
            price: t.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Error in POST /api/lab/orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
