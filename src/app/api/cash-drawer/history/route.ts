import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/cash-drawer/history
 * Returns closed shifts with pagination and details.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      prisma.cashDrawerShift.findMany({
        where: { tenantId },
        include: {
          payouts: true,
        },
        orderBy: { openedAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.cashDrawerShift.count({
        where: { tenantId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      shifts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching shift history:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch shift history" }, { status: 500 });
  }
}
