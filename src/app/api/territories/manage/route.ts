import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    
    const { action, name, regionId, zoneId, territoryId, beatId, id } = body;

    // --- UPDATE ACTIONS ---
    if (action === "UPDATE_REGION") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const region = await prisma.region.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, region });
    }
    if (action === "UPDATE_ZONE") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const zone = await prisma.zone.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, zone });
    }
    if (action === "UPDATE_TERRITORY") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const territory = await prisma.territory.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, territory });
    }
    if (action === "UPDATE_BEAT") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const beat = await prisma.beat.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, beat });
    }

    // --- DELETE ACTIONS ---
    if (action === "DELETE_REGION") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.region.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }
    if (action === "DELETE_ZONE") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.zone.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }
    if (action === "DELETE_TERRITORY") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.territory.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }
    if (action === "DELETE_BEAT") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.beat.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }


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
