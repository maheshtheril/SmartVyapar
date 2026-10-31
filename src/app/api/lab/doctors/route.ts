import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/lab/doctors - List referring doctors and their referral counts
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctors = await prisma.doctor.findMany({
      where: { tenantId: session.tenantId },
      include: {
        _count: {
          select: { labOrders: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, doctors });
  } catch (error: any) {
    console.error("Error in GET /api/lab/doctors:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/lab/doctors - Add a referring clinician
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, regNumber, qualification, clinicName, phone, city } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Doctor name is required" }, { status: 400 });
    }

    const doctor = await prisma.doctor.create({
      data: {
        tenantId: session.tenantId,
        name: name.trim(),
        regNumber: regNumber?.trim() || null,
        qualification: qualification?.trim() || null,
        clinicName: clinicName?.trim() || null,
        phone: phone?.trim() || null,
        city: city?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, doctor });
  } catch (error: any) {
    console.error("Error in POST /api/lab/doctors:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
