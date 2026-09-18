import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/customers?q=... - Search or list existing customers for autocomplete
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();

    const where: any = {
      tenantId,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
