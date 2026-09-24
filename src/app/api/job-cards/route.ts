import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { generateNextInvoiceNumber } from "@/lib/invoice-sequence";
import { StockLogType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const vehicleId = searchParams.get("vehicleId");

    const where: any = { tenantId: session.tenantId };
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;

    const jobCards = await prisma.jobCard.findMany({
      where,
      include: {
        vehicle: { include: { customer: true } },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(jobCards);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const tenantId = session.tenantId;

    const body = await request.json();
    const { vehicleId, customerId, odometerReading, customerConcerns, mechanicNotes, assignedMechanic, items } = body;

    if (!vehicleId || !customerId) {
      return NextResponse.json({ error: "Vehicle ID and Customer ID are required" }, { status: 400 });
    }

    // Tenant validation: ensure customer and vehicle belong to the authenticated tenant
    const [customer, vehicle] = await Promise.all([
      prisma.customer.findFirst({ where: { id: customerId, tenantId } }),
      prisma.customerVehicle.findFirst({ where: { id: vehicleId, tenantId, customerId } })
    ]);

    if (!customer) throw new Error("Customer not found or access denied");
    if (!vehicle) throw new Error("Vehicle not found or access denied");

    // Calculate total and validate inputs (P0)
    let estimatedTotal = 0;
    if (items && items.length > 0) {
      for (const item of items) {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        
        if (!Number.isFinite(qty) || qty <= 0) {
          return NextResponse.json({ error: `Invalid quantity ${item.quantity}. Must be > 0.` }, { status: 400 });
        }
        if (!Number.isFinite(price) || price < 0) {
          return NextResponse.json({ error: `Invalid unit price ${item.unitPrice}. Cannot be negative.` }, { status: 400 });
        }
        
        const type = item.itemType || 'PART';
        if (type === 'PART' && !item.productId) {
          return NextResponse.json({ error: `Product ID is required for PART items.` }, { status: 400 });
        }

        estimatedTotal += (qty * price);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate atomic unique job card number
      const { invoiceNumber: jobCardNumber } = await generateNextInvoiceNumber(tx, {
        tenantId,
        prefix: "JC",
      });

      // Pre-flight tenant validation for products and batches
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.productId) {
            const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
            if (!product) throw new Error(`Product ${item.productId} not found or access denied`);
          }
          if (item.batchId) {
            const batch = await tx.batch.findFirst({ where: { id: item.batchId, tenantId, productId: item.productId } });
            if (!batch) throw new Error(`Batch ${item.batchId} not found, does not belong to the product, or access denied`);
          }
        }
      }

      const jobCard = await tx.jobCard.create({
        data: {
          tenantId,
          jobCardNumber,
          vehicleId,
          customerId,
          odometerReading: odometerReading ? parseInt(odometerReading) : null,
          customerConcerns,
          mechanicNotes,
          assignedMechanic,
          estimatedTotal,
          items: {
            create: items?.map((item: any) => ({
              itemType: item.itemType || 'PART',
              productId: item.productId,
              batchId: item.batchId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: Number(item.quantity) * Number(item.unitPrice)
            })) || []
          }
        },
        include: { items: true, vehicle: true }
      });

      // Parts are reserved/estimated during creation, NOT consumed.
      // Actual consumption happens when the job card moves to IN_PROGRESS or via direct part issuance.

      return jobCard;
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

