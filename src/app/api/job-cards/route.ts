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

    // Calculate total
    const estimatedTotal = items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0) || 0;

    const result = await prisma.$transaction(async (tx) => {
      // Generate atomic unique job card number
      const { invoiceNumber: jobCardNumber } = await generateNextInvoiceNumber(tx, {
        tenantId,
        prefix: "JC",
      });

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

      // Deduct inventory for parts if items were provided
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.itemType === 'PART' && item.productId) {
            // Tenant validation for product
            const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
            if (!product) throw new Error(`Product ${item.productId} not found or access denied`);

            // Deduct from product overall stock
            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: { currentStock: { decrement: Number(item.quantity) } }
            });

            if (Number(updatedProduct.currentStock) < 0) {
              throw new Error(`Insufficient stock for ${product.name}`);
            }

            // Deduct from batch if specified
            if (item.batchId) {
              const batch = await tx.batch.findFirst({ where: { id: item.batchId, tenantId, productId: item.productId } });
              if (!batch) throw new Error(`Batch ${item.batchId} not found or access denied`);

              await tx.batch.update({
                where: { id: item.batchId },
                data: { currentStock: { decrement: Number(item.quantity) } }
              });
            }

            // Record StockLog for traceability
            await tx.stockLog.create({
              data: {
                tenantId,
                productId: item.productId,
                type: StockLogType.CONSUMPTION_OUT,
                changeQty: -Number(item.quantity),
                referenceId: jobCardNumber,
                note: `Consumed in Job Card ${jobCardNumber} for vehicle ${vehicle.licensePlate}`,
              }
            });
          }
        }
      }

      return jobCard;
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
