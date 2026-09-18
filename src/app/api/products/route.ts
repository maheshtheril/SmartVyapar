import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { CreateProductSchema } from "@/lib/schemas/product";
import { AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/products - Fetch real products from Neon DB
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/products - Create a new product in Neon DB (OWNER/MANAGER only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const validation = validateBody(CreateProductSchema, body);
    if (!validation.success) {
      return validation.response;
    }
    const data = validation.data;

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          tenantId,
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          hsnCode: data.hsnCode,
          category: data.category,
          baseUnit: data.baseUnit,
          hasAltUnit: data.hasAltUnit,
          altUnit: data.hasAltUnit ? data.altUnit : null,
          conversionFactor: data.hasAltUnit && data.conversionFactor ? data.conversionFactor : 1.0,
          purchasePrice: data.purchasePrice,
          purchasePricePerAlt: data.purchasePricePerAlt,
          sellingPrice: data.sellingPrice,
          sellingPricePerAlt: data.sellingPricePerAlt,
          mrp: data.mrp ?? data.sellingPrice,
          gstRate: data.gstRate,
          currentStock: data.initialStock,
          minStockAlert: data.minStockAlert,
        },
      });

      if (data.initialStock > 0) {
        await tx.stockLog.create({
          data: {
            tenantId,
            productId: p.id,
            changeQty: data.initialStock,
            type: "INITIAL",
            note: "Initial product stock entry",
          },
        });
      }

      await recordAuditLog(
        {
          tenantId,
          userId: session.userId,
          userName: session.name,
          action: AuditAction.CREATE,
          entityType: "PRODUCT",
          entityId: p.id,
          details: {
            name: p.name,
            sku: p.sku,
            sellingPrice: data.sellingPrice,
            mrp: data.mrp,
            initialStock: data.initialStock,
          },
        },
        tx
      );

      return p;
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error creating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
