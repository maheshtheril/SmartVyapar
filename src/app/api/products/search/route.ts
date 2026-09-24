import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20");

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      // If no query, return top 20 active products
      const products = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        take: limit,
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ success: true, products });
    }

    // Try exact barcode / SKU / Part Number / OEM Number matches first
    const exactMatch = await prisma.product.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { barcode: { equals: trimmedQuery, mode: "insensitive" } },
          { sku: { equals: trimmedQuery, mode: "insensitive" } },
          { partNumber: { equals: trimmedQuery, mode: "insensitive" } },
          { oemNumber: { equals: trimmedQuery, mode: "insensitive" } },
        ]
      }
    });

    if (exactMatch) {
      return NextResponse.json({ success: true, products: [exactMatch] });
    }

    // If no exact match, do a fuzzy / contains search across relevant fields
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: trimmedQuery, mode: "insensitive" } },
          { brand: { contains: trimmedQuery, mode: "insensitive" } },
          { compatibleMakes: { contains: trimmedQuery, mode: "insensitive" } },
          { compatibleModels: { contains: trimmedQuery, mode: "insensitive" } },
          { partNumber: { contains: trimmedQuery, mode: "insensitive" } },
          { oemNumber: { contains: trimmedQuery, mode: "insensitive" } },
        ]
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, products });

  } catch (error: any) {
    console.error("Error in product search:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
