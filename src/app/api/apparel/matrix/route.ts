import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/apparel/matrix?brand=Raymond&category=Formal Shirts
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand") || "Raymond";

    const variants = await prisma.product.findMany({
      where: {
        tenantId,
        brand: { equals: brand, mode: "insensitive" },
        baseUnit: "PCS",
      },
      orderBy: { sku: "asc" },
    });

    // Extract unique sizes and colors
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();

    const matrixData: Record<string, Record<string, any>> = {};

    for (const v of variants) {
      // Parse size and color from name: e.g. "Raymond Slim Fit Cotton Shirt (Size 40, Sky Blue)"
      const match = v.name.match(/\((?:Size|Waist)\s*([^,]+),\s*([^)]+)\)/i);
      let size = "Free";
      let color = "Standard";

      if (match) {
        size = match[1].trim();
        color = match[2].trim();
      } else if (v.displayName && v.displayName.includes("•")) {
        const parts = v.displayName.split("•").map(s => s.trim());
        size = parts[0].replace(/^(Size|Waist)\s*/i, "");
        color = parts[1] || "Standard";
      }

      sizeSet.add(size);
      colorSet.add(color);

      if (!matrixData[color]) {
        matrixData[color] = {};
      }
      matrixData[color][size] = {
        id: v.id,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        sellingPrice: v.sellingPrice,
        mrp: v.mrp,
        currentStock: Number(v.currentStock || 0),
        minStockAlert: Number(v.minStockAlert || 2),
      };
    }

    return NextResponse.json({
      success: true,
      brand,
      sizes: Array.from(sizeSet).sort((a, b) => parseInt(a) - parseInt(b)),
      colors: Array.from(colorSet),
      matrix: matrixData,
    });
  } catch (error: any) {
    console.error("Error in GET /api/apparel/matrix:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
