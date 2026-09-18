import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/batches - List batches with expiry calculations
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (productId) {
      where.productId = productId;
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            baseUnit: true,
          },
        },
      },
      orderBy: { expiryDate: "asc" }, // FEFO: First Expiry First Out
    });

    // Compute expiry metrics
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const enriched = batches.map((b) => {
      let expiryStatus: "NORMAL" | "EXPIRING_SOON" | "EXPIRED" = "NORMAL";
      let daysRemaining: number | null = null;

      if (b.expiryDate) {
        const exp = new Date(b.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;

        if (diffDays < 0) {
          expiryStatus = "EXPIRED";
        } else if (diffDays <= 30) {
          expiryStatus = "EXPIRING_SOON";
        }
      }

      return {
        ...b,
        expiryStatus,
        daysRemaining,
      };
    });

    const expiredCount = enriched.filter((b) => b.expiryStatus === "EXPIRED").length;
    const expiringSoonCount = enriched.filter((b) => b.expiryStatus === "EXPIRING_SOON").length;

    return NextResponse.json({
      success: true,
      batches: enriched,
      metrics: {
        totalBatches: enriched.length,
        expiredCount,
        expiringSoonCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching batches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/batches - Create a new inward batch with stock update
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      productId,
      batchNumber,
      mfgDate,
      expiryDate,
      costPrice,
      sellingPrice,
      mrp,
      initialStock = 0,
    } = body;

    if (!productId || !batchNumber || !sellingPrice || !mrp) {
      return NextResponse.json(
        { error: "Product, Batch Number, MRP, and Sale Price are required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create or update batch
      const batch = await tx.batch.upsert({
        where: {
          tenantId_productId_batchNumber: {
            tenantId,
            productId,
            batchNumber,
          },
        },
        update: {
          mfgDate: mfgDate ? new Date(mfgDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: Number(costPrice || 0),
          sellingPrice: Number(sellingPrice),
          mrp: Number(mrp),
          currentStock: {
            increment: Number(initialStock || 0),
          },
        },
        create: {
          tenantId,
          productId,
          batchNumber,
          mfgDate: mfgDate ? new Date(mfgDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: Number(costPrice || 0),
          sellingPrice: Number(sellingPrice),
          mrp: Number(mrp),
          currentStock: Number(initialStock || 0),
        },
      });

      // Update product's hasBatchTracking flag and overall stock
      await tx.product.update({
        where: { id: productId },
        data: {
          hasBatchTracking: true,
          currentStock: {
            increment: Number(initialStock || 0),
          },
        },
      });

      // Stock Log
      if (Number(initialStock) > 0) {
        await tx.stockLog.create({
          data: {
            tenantId,
            productId,
            changeQty: Number(initialStock),
            type: "PURCHASE_IN",
            note: `Inward Batch ${batchNumber} (MRP: Rs.${mrp}, Sale: Rs.${sellingPrice})`,
          },
        });
      }

      return batch;
    });

    return NextResponse.json({ success: true, batch: result });
  } catch (error: any) {
    console.error("Error creating batch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
