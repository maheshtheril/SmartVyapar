import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { SalonAppointmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/salon/appointments?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    // Filter appointments for that specific date (UTC range)
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    const appointments = await prisma.salonAppointment.findMany({
      where: {
        tenantId,
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: [
        { scheduledTime: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Summary metrics for today
    let totalBooked = 0;
    let totalInService = 0;
    let totalCompleted = 0;
    let totalCancelled = 0;
    let projectedRevenue = 0;

    for (const appt of appointments) {
      if (appt.status === "BOOKED" || appt.status === "CHECKED_IN") totalBooked++;
      else if (appt.status === "IN_SERVICE") totalInService++;
      else if (appt.status === "COMPLETED") totalCompleted++;
      else if (appt.status === "CANCELLED" || appt.status === "NO_SHOW") totalCancelled++;

      if (appt.status !== "CANCELLED" && appt.status !== "NO_SHOW") {
        projectedRevenue += Number(appt.servicePrice || 0);
      }
    }

    // Also fetch available service products from tenant catalog for autocomplete
    const services = await prisma.product.findMany({
      where: {
        tenantId,
        OR: [
          { baseUnit: "SERVICE" },
          { hsnCode: { startsWith: "9997" } },
          { category: { contains: "Hair", mode: "insensitive" } },
          { category: { contains: "Spa", mode: "insensitive" } },
          { category: { contains: "Skin", mode: "insensitive" } },
          { category: { contains: "Nail", mode: "insensitive" } },
          { category: { contains: "Massage", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        baseUnit: true,
        category: true,
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      date: dateParam,
      appointments,
      metrics: {
        total: appointments.length,
        booked: totalBooked,
        inService: totalInService,
        completed: totalCompleted,
        cancelled: totalCancelled,
        projectedRevenue,
      },
      services,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/salon/appointments error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch appointments" }, { status: 500 });
  }
}

// POST /api/salon/appointments - Book a new appointment slot
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      clientName,
      clientPhone,
      stylistName,
      chairNumber,
      serviceName,
      servicePrice,
      durationMinutes,
      scheduledDate,
      scheduledTime,
      notes,
    } = body;

    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ error: "Client / Customer name is required" }, { status: 400 });
    }
    if (!clientPhone || !clientPhone.trim()) {
      return NextResponse.json({ error: "Client mobile phone number is required" }, { status: 400 });
    }
    if (!serviceName || !serviceName.trim()) {
      return NextResponse.json({ error: "Service name is required" }, { status: 400 });
    }
    if (!scheduledDate) {
      return NextResponse.json({ error: "Appointment date is required" }, { status: 400 });
    }
    if (!scheduledTime) {
      return NextResponse.json({ error: "Appointment time slot is required" }, { status: 400 });
    }

    const dateObj = new Date(`${String(scheduledDate).slice(0, 10)}T00:00:00.000Z`);

    const appointment = await prisma.salonAppointment.create({
      data: {
        tenantId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        stylistName: stylistName?.trim() || null,
        chairNumber: chairNumber?.trim() || null,
        serviceName: serviceName.trim(),
        servicePrice: Number(servicePrice || 0),
        durationMinutes: Number(durationMinutes || 30),
        scheduledDate: dateObj,
        scheduledTime: scheduledTime.trim(),
        status: SalonAppointmentStatus.BOOKED,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      appointment,
      message: "Appointment slot booked successfully",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/salon/appointments error:", err);
    return NextResponse.json({ error: err.message || "Failed to book appointment" }, { status: 500 });
  }
}
