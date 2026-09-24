import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      const customers = await prisma.customer.findMany({
        where: { tenantId },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json({ success: true, customers });
    }

    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: trimmedQuery, mode: "insensitive" } },
          { phone: { contains: trimmedQuery } },
        ]
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, customers });

  } catch (error: any) {
    console.error("Error in customer search:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
