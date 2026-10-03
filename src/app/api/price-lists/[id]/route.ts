import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER", "STAFF"]);
    
    const priceList = await prisma.priceList.findUnique({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!priceList) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, priceList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const body = await req.json();

    const priceList = await prisma.priceList.update({
      where: { id: params.id, tenantId: session.tenantId },
      data: {
        name: body.name,
        description: body.description,
        type: body.type,
        value: Number(body.value || 0),
        isActive: body.isActive !== undefined ? body.isActive : true
      }
    });

    return NextResponse.json({ success: true, priceList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Add an item override
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const body = await req.json();

    const item = await prisma.priceListItem.upsert({
      where: {
        priceListId_productId: { priceListId: params.id, productId: body.productId }
      },
      update: {
        type: body.type,
        value: Number(body.value || 0)
      },
      create: {
        priceListId: params.id,
        productId: body.productId,
        type: body.type,
        value: Number(body.value || 0)
      }
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    
    // Check if it's an item override delete (if productId is passed as query param)
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (productId) {
      await prisma.priceListItem.delete({
        where: { priceListId_productId: { priceListId: params.id, productId } }
      });
      return NextResponse.json({ success: true });
    }

    // Otherwise delete whole list
    await prisma.priceList.delete({
      where: { id: params.id, tenantId: session.tenantId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
