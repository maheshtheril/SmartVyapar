import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const territories = await prisma.territory.findMany({
      where: { tenantId },
      orderBy: [
        { name: "asc" },
      ],
    });

    return NextResponse.json({ success: true, territories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { name, zone } = body;

    if (!name) {
      return NextResponse.json({ error: "Territory name is required" }, { status: 400 });
    }

    const territory = await prisma.territory.create({
      data: {
        tenantId,
        name,
        zone: zone || null,
      },
    });

    return NextResponse.json({ success: true, territory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
