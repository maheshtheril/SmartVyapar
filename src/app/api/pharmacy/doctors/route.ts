import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/pharmacy/doctors - List prescribing doctors for auto-complete
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const where: any = { tenantId };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { regNumber: { contains: query, mode: "insensitive" } },
        { clinicName: { contains: query, mode: "insensitive" } },
      ];
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json({ success: true, doctors });
  } catch (error: any) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/pharmacy/doctors - Create new doctor in master
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { name, regNumber, qualification, clinicName, phone, city } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Doctor name is required." }, { status: 400 });
    }

    const doctor = await prisma.doctor.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: name.trim(),
        },
      },
      create: {
        tenantId,
        name: name.trim(),
        regNumber: regNumber?.trim() || null,
        qualification: qualification?.trim() || null,
        clinicName: clinicName?.trim() || null,
        phone: phone?.trim() || null,
        city: city?.trim() || null,
      },
      update: {
        regNumber: regNumber?.trim() || null,
        qualification: qualification?.trim() || null,
        clinicName: clinicName?.trim() || null,
        phone: phone?.trim() || null,
        city: city?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, doctor });
  } catch (error: any) {
    console.error("Error saving doctor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
