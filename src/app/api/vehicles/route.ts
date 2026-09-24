import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const licensePlate = searchParams.get("licensePlate");

    const where: any = { tenantId: user.tenantId };
    if (customerId) where.customerId = customerId;
    if (licensePlate) where.licensePlate = { contains: licensePlate, mode: "insensitive" };

    const vehicles = await prisma.customerVehicle.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(vehicles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { customerId, licensePlate, make, model, year, vin } = body;

    if (!customerId || !licensePlate) {
      return NextResponse.json({ error: "Customer ID and License Plate are required" }, { status: 400 });
    }

    const vehicle = await prisma.customerVehicle.create({
      data: {
        tenantId: user.tenantId,
        customerId,
        licensePlate: licensePlate.toUpperCase().replace(/[\s\-_]/g, ""),
        make,
        model,
        year: year ? parseInt(year) : null,
        vin
      }
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Vehicle with this License Plate already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
