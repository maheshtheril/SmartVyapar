import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/apparel/matrix?brand=...&category=...
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    let brand = searchParams.get("brand")?.trim();
    const category = searchParams.get("category")?.trim();

    // If no brand or category is passed, dynamically pick the first brand that has PCS garments
    if (!brand && !category) {
      const firstWithBrand = await prisma.product.findFirst({
        where: { tenantId, baseUnit: "PCS", brand: { not: null } },
        select: { brand: true },
        orderBy: { name: "asc" },
      });
      brand = firstWithBrand?.brand || undefined;
    }

    const where: any = {
      tenantId,
      baseUnit: "PCS",
    };

    if (brand && brand !== "ALL") {
      where.brand = { equals: brand, mode: "insensitive" };
    }

    if (category && category !== "ALL") {
      where.category = { equals: category, mode: "insensitive" };
    }

    const variants = await prisma.product.findMany({
      where,
      orderBy: [{ name: "asc" }, { sku: "asc" }],
    });

    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    const matrixData: Record<string, Record<string, any>> = {};

    for (const v of variants) {
      // Smart extraction of Size and Color from various naming conventions
      let size = "Free";
      let color = "Standard";

      // Pattern 1: (Size 40, Sky Blue) or (Waist 32, Dark Indigo)
      const matchParens = v.name.match(/\((?:Size|Waist)?\s*([^,]+),\s*([^)]+)\)/i);
      if (matchParens) {
        size = matchParens[1].replace(/^(Size|Waist)\s*/i, "").trim();
        color = matchParens[2].trim();
      } else if (v.displayName && v.displayName.includes("•")) {
        // Pattern 2: "Size 40 • Sky Blue" or "Waist 32 • Dark Indigo"
        const parts = v.displayName.split("•").map((s) => s.trim());
        size = parts[0].replace(/^(Size|Waist)\s*/i, "").trim();
        color = parts[1] || "Standard";
      } else {
        // Pattern 3: Look for size tokens (38, 40, 42, 44, S, M, L, XL, XXL) in product name
        const sizeTokenMatch = v.name.match(/\b(3[6-9]|4[0-8]|Waist\s*\d+|S|M|L|XL|XXL|XXXL|FS)\b/i);
        if (sizeTokenMatch) {
          size = sizeTokenMatch[1].replace(/^Waist\s*/i, "").trim();
        }

        // Color token
        const colorWords = ["Blue", "White", "Black", "Navy", "Indigo", "Green", "Red", "Maroon", "Purple", "Pink", "Yellow", "Charcoal", "Beige", "Ivory", "Peach", "Brown", "Grey", "Gray", "Gold"];
        for (const cw of colorWords) {
          if (new RegExp(`\\b${cw}\\b`, "i").test(v.name)) {
            color = cw;
            break;
          }
        }
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

    // Sort sizes naturally (numerics first, then alpha)
    const sortedSizes = Array.from(sizeSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.localeCompare(b);
    });

    return NextResponse.json({
      success: true,
      brand: brand || "All Styles",
      sizes: sortedSizes,
      colors: Array.from(colorSet),
      matrix: matrixData,
    });
  } catch (error: any) {
    console.error("Error in GET /api/apparel/matrix:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
