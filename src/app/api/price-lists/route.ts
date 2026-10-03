import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER", "STAFF"]);
    const tenantId = session.tenantId;

    const priceLists = await prisma.priceList.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: { select: { customers: true, items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, priceLists });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;
    const body = await req.json();

    const { name, description, type, value } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const priceList = await prisma.priceList.create({
      data: {
        tenantId,
        name,
        description,
        type: type || "PERCENTAGE_DISCOUNT",
        value: Number(value || 0),
      }
    });

    return NextResponse.json({ success: true, priceList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
