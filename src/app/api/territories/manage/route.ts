import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { action, name, regionId, zoneId, territoryId } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    if (action === "CREATE_REGION") {
      const region = await prisma.region.create({ data: { tenantId, name } });
      return NextResponse.json({ success: true, region });
    } 
    
    if (action === "CREATE_ZONE") {
      if (!regionId) return NextResponse.json({ error: "Region ID required" }, { status: 400 });
      const zone = await prisma.zone.create({ data: { tenantId, name, regionId } });
      return NextResponse.json({ success: true, zone });
    }

    if (action === "CREATE_TERRITORY") {
      if (!zoneId) return NextResponse.json({ error: "Zone ID required" }, { status: 400 });
      const territory = await prisma.territory.create({ data: { tenantId, name, zoneId } });
      return NextResponse.json({ success: true, territory });
    }

    if (action === "CREATE_BEAT") {
      if (!territoryId) return NextResponse.json({ error: "Territory ID required" }, { status: 400 });
      const beat = await prisma.beat.create({ data: { tenantId, name, territoryId } });
      return NextResponse.json({ success: true, beat });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
