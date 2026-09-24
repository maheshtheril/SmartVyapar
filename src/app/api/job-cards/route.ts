import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const vehicleId = searchParams.get("vehicleId");

    const where: any = { tenantId: user.tenantId };
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

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { vehicleId, customerId, odometerReading, customerConcerns, mechanicNotes, assignedMechanic, items } = body;

    if (!vehicleId || !customerId) {
      return NextResponse.json({ error: "Vehicle ID and Customer ID are required" }, { status: 400 });
    }

    // Generate unique job card number
    const count = await prisma.jobCard.count({ where: { tenantId: user.tenantId } });
    const jobCardNumber = `JC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Calculate total
    const estimatedTotal = items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const jobCard = await tx.jobCard.create({
        data: {
          tenantId: user.tenantId,
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
          if (item.itemType === 'PART' && item.batchId) {
            await tx.batch.update({
              where: { id: item.batchId },
              data: { quantity: { decrement: Number(item.quantity) } }
            });
          }
        }
      }

      return jobCard;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
