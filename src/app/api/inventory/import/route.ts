import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

interface ImportRow {
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  hsnCode?: string;
  baseUnit?: string;
  purchasePrice?: number | string;
  sellingPrice: number | string;
  mrp?: number | string;
  gstRate?: number | string;
  openingStock?: number | string;
  minStockAlert?: number | string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { items, mode = "upsert" } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Please provide a valid non-empty array of product items" },
        { status: 400 }
      );
    }

    if (items.length > 5000) {
      return NextResponse.json(
        { error: "Maximum bulk import limit is 5,000 items per file" },
        { status: 400 }
      );
    }

    // Pre-validate all items
    const errors: { row: number; item: string; reason: string }[] = [];
    const validRows: any[] = [];

    items.forEach((raw: ImportRow, idx: number) => {
      const rowNum = idx + 1;
      const name = (raw.name || "").trim();

      if (!name) {
        errors.push({ row: rowNum, item: "Unnamed", reason: "Product name is required" });
        return;
      }

      const sellingPrice = Number(raw.sellingPrice);
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        errors.push({ row: rowNum, item: name, reason: `Invalid selling price: "${raw.sellingPrice}"` });
        return;
      }

      let mrp = raw.mrp !== undefined && raw.mrp !== "" ? Number(raw.mrp) : sellingPrice;
      if (isNaN(mrp) || mrp < sellingPrice) {
        // Legal Metrology Act check: selling price cannot exceed MRP
        errors.push({
          row: rowNum,
          item: name,
          reason: `Selling price (₹${sellingPrice}) cannot exceed MRP (₹${mrp})`,
        });
        return;
      }

      const purchasePrice = Number(raw.purchasePrice || 0);
      const gstRate = Number(raw.gstRate ?? 18);
      const openingStock = Math.max(0, Number(raw.openingStock || 0));
      const minStockAlert = Math.max(1, Number(raw.minStockAlert || 5));

      if (!raw.hsnCode || !String(raw.hsnCode).trim()) {
        throw new Error(`HSN code is required for product: ${name}`);
      }

      validRows.push({
        name,
        sku: raw.sku ? String(raw.sku).trim() : null,
        barcode: raw.barcode ? String(raw.barcode).trim() : null,
        category: (raw.category || "General").trim(),
        hsnCode: String(raw.hsnCode).trim(),
        baseUnit: (raw.baseUnit || "PCS").trim().toUpperCase(),
        purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
        sellingPrice,
        mrp,
        gstRate: isNaN(gstRate) ? 18 : gstRate,
        openingStock: isNaN(openingStock) ? 0 : openingStock,
        minStockAlert: isNaN(minStockAlert) ? 5 : minStockAlert,
      });
    });

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows found in the import file",
          validationErrors: errors,
        },
        { status: 422 }
      );
    }

    // Execute bulk upsert in chunks within a database transaction
    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(
      async (tx) => {
        // Fetch existing SKUs and Barcodes for this tenant to check deduplication
        const existingProducts = await tx.product.findMany({
          where: { tenantId },
          select: { id: true, name: true, sku: true, barcode: true, currentStock: true },
        });

        const productMapBySku = new Map<string, typeof existingProducts[0]>();
        const productMapByBarcode = new Map<string, typeof existingProducts[0]>();
        const productMapByName = new Map<string, typeof existingProducts[0]>();

        for (const p of existingProducts) {
          if (p.sku) productMapBySku.set(p.sku.toLowerCase(), p);
          if (p.barcode) productMapByBarcode.set(p.barcode.toLowerCase(), p);
          productMapByName.set(p.name.toLowerCase(), p);
        }

        for (const row of validRows) {
          // Check if product already exists by SKU, Barcode, or exact Name
          let match =
            (row.sku && productMapBySku.get(row.sku.toLowerCase())) ||
            (row.barcode && productMapByBarcode.get(row.barcode.toLowerCase())) ||
            productMapByName.get(row.name.toLowerCase());

          if (match) {
            // Update existing product
            await tx.product.update({
              where: { id: match.id },
              data: {
                purchasePrice: row.purchasePrice,
                sellingPrice: row.sellingPrice,
                mrp: row.mrp,
                gstRate: row.gstRate,
                minStockAlert: row.minStockAlert,
                category: row.category,
                hsnCode: row.hsnCode,
                ...(row.openingStock > 0
                  ? { currentStock: { increment: row.openingStock } }
                  : {}),
              },
            });

            if (row.openingStock > 0) {
              await tx.stockLog.create({
                data: {
                  tenantId,
                  productId: match.id,
                  changeQty: row.openingStock,
                  type: "PURCHASE_IN",
                  note: `Bulk CSV import stock addition (+${row.openingStock})`,
                },
              });
            }

            updatedCount++;
          } else {
            // Create new product
            const created = await tx.product.create({
              data: {
                tenantId,
                name: row.name,
                sku: row.sku,
                barcode: row.barcode,
                category: row.category,
                hsnCode: row.hsnCode,
                baseUnit: row.baseUnit,
                purchasePrice: row.purchasePrice,
                sellingPrice: row.sellingPrice,
                mrp: row.mrp,
                gstRate: row.gstRate,
                currentStock: row.openingStock,
                minStockAlert: row.minStockAlert,
                isActive: true,
              },
            });

            if (row.openingStock > 0) {
              await tx.stockLog.create({
                data: {
                  tenantId,
                  productId: created.id,
                  changeQty: row.openingStock,
                  type: "INITIAL",
                  note: `Initial opening stock via Bulk CSV import (+${row.openingStock})`,
                },
              });
            }

            // Add to in-memory lookup map to avoid duplicate creates within the same file
            if (row.sku) productMapBySku.set(row.sku.toLowerCase(), created);
            if (row.barcode) productMapByBarcode.set(row.barcode.toLowerCase(), created);
            productMapByName.set(row.name.toLowerCase(), created);

            createdCount++;
          }
        }
      },
      { maxWait: 15000, timeout: 60000 } // 60s timeout & 15s maxWait for large CSV batches
    );

    // Record statutory audit log
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.CREATE,
      entityType: "BULK_INVENTORY_IMPORT",
      entityId: "BULK_IMPORT",
      details: {
        totalRows: items.length,
        createdCount,
        updatedCount,
        skippedErrors: errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${createdCount + updatedCount} items (${createdCount} created, ${updatedCount} updated).`,
      createdCount,
      updatedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 20), // return first 20 errors for user feedback
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError" || error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error in bulk inventory import:", error);
    return NextResponse.json(
      { error: error.message || "Bulk import failed. Please check your data format." },
      { status: 500 }
    );
  }
}
