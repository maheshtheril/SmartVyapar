import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/pharmacy/expiry - Near-Expiry batches for supplier returns
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "ALL"; // "EXPIRED", "30", "60", "90", "ALL"

    const now = new Date();
    const d30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const d90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const batches = await prisma.batch.findMany({
      where: {
        tenantId,
        currentStock: { gt: 0 },
        expiryDate: {
          not: null,
          lte: d90,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            drugGenericName: true,
            baseUnit: true,
            altUnit: true,
            conversionFactor: true,
            purchasePrice: true,
          },
        },
      },
      orderBy: { expiryDate: "asc" },
    });

    let expiredValue = 0;
    let days30Value = 0;
    let days60Value = 0;
    let days90Value = 0;

    const categorized = batches.map((b) => {
      const exp = b.expiryDate ? new Date(b.expiryDate) : null;
      const stock = Number(b.currentStock);
      const cost = Number(b.costPrice || b.product.purchasePrice || 0);
      const value = Number((stock * cost).toFixed(2));

      let bucket: "EXPIRED" | "30_DAYS" | "60_DAYS" | "90_DAYS" = "90_DAYS";

      if (exp && exp < now) {
        bucket = "EXPIRED";
        expiredValue += value;
      } else if (exp && exp <= d30) {
        bucket = "30_DAYS";
        days30Value += value;
      } else if (exp && exp <= d60) {
        bucket = "60_DAYS";
        days60Value += value;
      } else {
        bucket = "90_DAYS";
        days90Value += value;
      }

      return {
        ...b,
        bucket,
        stockValue: value,
      };
    });

    const filtered = filter === "ALL" 
      ? categorized 
      : categorized.filter((b) => {
          if (filter === "EXPIRED") return b.bucket === "EXPIRED";
          if (filter === "30") return b.bucket === "30_DAYS";
          if (filter === "60") return b.bucket === "60_DAYS";
          if (filter === "90") return b.bucket === "90_DAYS";
          return true;
        });

    return NextResponse.json({
      success: true,
      summary: {
        expiredCount: categorized.filter((b) => b.bucket === "EXPIRED").length,
        expiredValue: Number(expiredValue.toFixed(2)),
        days30Count: categorized.filter((b) => b.bucket === "30_DAYS").length,
        days30Value: Number(days30Value.toFixed(2)),
        days60Count: categorized.filter((b) => b.bucket === "60_DAYS").length,
        days60Value: Number(days60Value.toFixed(2)),
        days90Count: categorized.filter((b) => b.bucket === "90_DAYS").length,
        days90Value: Number(days90Value.toFixed(2)),
        totalAtRiskValue: Number((expiredValue + days30Value + days60Value + days90Value).toFixed(2)),
      },
      batches: filtered,
    });
  } catch (error: any) {
    console.error("Error fetching expiry monitor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
