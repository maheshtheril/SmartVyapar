import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    // Check if tenant has territory management enabled
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enableTerritory: true }
    });

    if (!tenant?.enableTerritory) {
      return NextResponse.json({ success: true, enabled: false, regions: [] });
    }

    const regions = await prisma.region.findMany({
      where: { tenantId },
      include: {
        zones: {
          include: {
            territories: {
              include: {
                beats: true
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ success: true, enabled: true, regions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
