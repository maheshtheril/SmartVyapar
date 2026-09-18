import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface VariantItemInput {
  name: string;
  sku: string;
  barcode: string;
  hsnCode?: string;
  category?: string;
  baseUnit?: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstRate: number;
  initialStock: number;
  minStockAlert?: number;
}

// POST /api/products/batch - Bulk create variants atomically in Neon DB
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { variants } = body;

    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { error: "Please provide a valid non-empty array of variants" },
        { status: 400 }
      );
    }

    // Execute atomic transaction for all variants and their stock logs
    const createdProducts = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of variants as VariantItemInput[]) {
        const product = await tx.product.create({
          data: {
            tenantId,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            hsnCode: item.hsnCode || "6402",
            category: item.category || "Footwear",
            baseUnit: item.baseUnit || "PCS",
            purchasePrice: Number(item.purchasePrice),
            sellingPrice: Number(item.sellingPrice),
            mrp: Number(item.mrp || item.sellingPrice),
            gstRate: Number(item.gstRate || 12),
            currentStock: Number(item.initialStock || 0),
            minStockAlert: Number(item.minStockAlert || 5),
          },
        });

        if (Number(item.initialStock) > 0) {
          await tx.stockLog.create({
            data: {
              tenantId,
              productId: product.id,
              changeQty: Number(item.initialStock),
              type: "INITIAL",
              note: `Variant opening stock for ${item.name}`,
            },
          });
        }

        results.push(product);
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      count: createdProducts.length,
      products: createdProducts,
    });
  } catch (error: any) {
    console.error("Error creating variant products in batch:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create variants in batch" },
      { status: 500 }
    );
  }
}
