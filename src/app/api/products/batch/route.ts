import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireRole, AuthError, ForbiddenError } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { recordAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Zod schema for each variant item in the batch
const BatchVariantSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters"),
  sku: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  hsnCode: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  baseUnit: z.string().trim().default("PCS"),
  purchasePrice: z.coerce.number().nonnegative("Purchase price cannot be negative").default(0),
  sellingPrice: z.coerce.number().nonnegative("Selling price cannot be negative"),
  mrp: z.coerce.number().nonnegative().optional().nullable(),
  gstRate: z.coerce.number().nonnegative().default(18),
  initialStock: z.coerce.number().nonnegative().default(0),
  minStockAlert: z.coerce.number().nonnegative().default(5),
});

const BatchRequestSchema = z.object({
  variants: z.array(BatchVariantSchema).min(1, "Please provide at least one variant"),
});

// POST /api/products/batch — Bulk create variants atomically
// Requires OWNER or MANAGER role (not STAFF)
export async function POST(req: NextRequest) {
  try {
    // 🔐 Role-gated: only OWNER or MANAGER can bulk-create products
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();

    // ✅ Zod validation on entire request body
    const validation = validateBody(BatchRequestSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { variants } = validation.data;

    // Execute atomic transaction for all variants, stock logs, and audit logs
    const createdProducts = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of variants) {
        const product = await tx.product.create({
          data: {
            tenantId,
            name: item.name,
            sku: item.sku || null,
            barcode: item.barcode || null,
            hsnCode: item.hsnCode || "9983",   // ✅ Generic default (not hardcoded Footwear)
            category: item.category || null,   // ✅ No hardcoded "Footwear" default
            baseUnit: item.baseUnit || "PCS",
            purchasePrice: Number(item.purchasePrice),
            sellingPrice: Number(item.sellingPrice),
            mrp: Number(item.mrp ?? item.sellingPrice),
            gstRate: Number(item.gstRate ?? 18),
            currentStock: Number(item.initialStock ?? 0),
            minStockAlert: Number(item.minStockAlert ?? 5),
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

        // ✅ Audit log entry for each product created in batch
        await recordAuditLog(
          {
            tenantId,
            userId: session.userId,
            userName: session.name,
            action: AuditAction.CREATE,
            entityType: "PRODUCT",
            entityId: product.id,
            details: {
              name: product.name,
              sku: product.sku,
              sellingPrice: Number(product.sellingPrice),
              initialStock: item.initialStock,
              source: "BATCH_CREATE",
            },
          },
          tx
        );

        results.push(product);
      }

      return results;
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

    return NextResponse.json({
      success: true,
      count: createdProducts.length,
      products: createdProducts,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating variant products in batch:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create variants in batch" },
      { status: 500 }
    );
  }
}
