import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { SalonAppointmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export interface SalonServiceItem {
  name: string;
  price: number;
  durationMinutes: number;
  stylistName?: string;
  commissionPercent?: number;
  commissionAmount?: number;
}

// GET /api/salon/appointments?date=YYYY-MM-DD&clientPhone=...
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const clientPhoneQuery = searchParams.get("clientPhone");

    // Client history lookup (Consultation Card & past visit record)
    if (clientPhoneQuery) {
      const history = await prisma.salonAppointment.findMany({
        where: {
          tenantId,
          clientPhone: clientPhoneQuery.trim(),
        },
        orderBy: { scheduledDate: "desc" },
        take: 10,
      });

      // Find the latest saved consultation card/client history
      const latestConsultation = history.find((h) => h.clientHistory !== null)?.clientHistory || null;

      return NextResponse.json({
        success: true,
        history,
        latestConsultation,
      });
    }

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

    // Summary metrics for the day
    let totalBooked = 0;
    let totalWaiting = 0;
    let totalInService = 0;
    let totalCompleted = 0;
    let totalCancelled = 0;
    let projectedRevenue = 0;
    let totalTips = 0;
    let totalCommissions = 0;

    // Stylist Commission & Performance Aggregations
    const stylistStats: Record<
      string,
      { stylistName: string; servicesCount: number; revenueGenerated: number; commissionEarned: number; tipsEarned: number }
    > = {};

    for (const appt of appointments) {
      if (appt.status === "BOOKED") totalBooked++;
      else if (appt.status === "WAITING") totalWaiting++;
      else if (appt.status === "CHECKED_IN") totalBooked++;
      else if (appt.status === "IN_SERVICE") totalInService++;
      else if (appt.status === "COMPLETED") totalCompleted++;
      else if (appt.status === "CANCELLED" || appt.status === "NO_SHOW") totalCancelled++;

      const price = Number(appt.servicePrice || 0);
      const tip = Number(appt.tipAmount || 0);
      const comm = Number(appt.totalCommission || 0);

      if (appt.status !== "CANCELLED" && appt.status !== "NO_SHOW") {
        projectedRevenue += price;
        totalTips += tip;
        totalCommissions += comm;
      }

      // Aggregate by Stylist
      const primaryStylist = appt.stylistName || "Unassigned";
      if (!stylistStats[primaryStylist]) {
        stylistStats[primaryStylist] = {
          stylistName: primaryStylist,
          servicesCount: 0,
          revenueGenerated: 0,
          commissionEarned: 0,
          tipsEarned: 0,
        };
      }
      if (appt.status !== "CANCELLED" && appt.status !== "NO_SHOW") {
        stylistStats[primaryStylist].servicesCount += 1;
        stylistStats[primaryStylist].revenueGenerated += price;
        stylistStats[primaryStylist].commissionEarned += comm;
        stylistStats[primaryStylist].tipsEarned += tip;
      }
    }

    // Fetch team members from tenant to offer as Stylists
    const staffMembers = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

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
          { category: { contains: "Salon", mode: "insensitive" } },
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

    // Walk-in queue: waiting or seated walk-ins
    const walkInQueue = appointments.filter(
      (a) => a.isWalkIn && (a.status === "WAITING" || a.status === "CHECKED_IN" || a.status === "IN_SERVICE")
    );

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, businessName: true, slug: true, phone: true },
    });

    return NextResponse.json({
      success: true,
      date: dateParam,
      tenantSlug: tenant?.slug || '',
      tenantName: tenant?.businessName || '',
      appointments,
      walkInQueue,
      metrics: {
        total: appointments.length,
        booked: totalBooked,
        waiting: totalWaiting,
        inService: totalInService,
        completed: totalCompleted,
        cancelled: totalCancelled,
        projectedRevenue,
        totalTips,
        totalCommissions,
      },
      stylistLeaderboard: Object.values(stylistStats),
      staffMembers,
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

// POST /api/salon/appointments - Book new appointment / Register Walk-in
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
      isWalkIn = false,
      tokenNumber,
      services = [], // Array of SalonServiceItem
      clientHistory = null, // { hairType, skinType, colorFormula, allergies, preferences }
      tipAmount = 0,
      commissionPercent = 0,
    } = body;

    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ error: "Client / Customer name is required" }, { status: 400 });
    }
    if (!clientPhone || !clientPhone.trim()) {
      return NextResponse.json({ error: "Client mobile phone number is required" }, { status: 400 });
    }

    // Process multi-service cart or single service
    let finalServiceName = serviceName?.trim() || "";
    let finalPrice = Number(servicePrice || 0);
    let finalDuration = Number(durationMinutes || 30);
    let finalCommission = 0;

    let computedServicesJson: any = null;

    if (Array.isArray(services) && services.length > 0) {
      computedServicesJson = services;
      finalServiceName = services.map((s) => s.name).join(" + ");
      finalPrice = services.reduce((sum, s) => sum + Number(s.price || 0), 0);
      finalDuration = services.reduce((sum, s) => sum + Number(s.durationMinutes || 30), 0);

      // Compute commissions for items
      finalCommission = services.reduce((sum, s) => {
        const itemCommPct = s.commissionPercent !== undefined ? s.commissionPercent : commissionPercent;
        const commAmt = s.commissionAmount !== undefined ? Number(s.commissionAmount) : (Number(s.price || 0) * Number(itemCommPct || 0)) / 100;
        return sum + commAmt;
      }, 0);
    } else {
      if (!finalServiceName) {
        return NextResponse.json({ error: "At least one service is required" }, { status: 400 });
      }
      finalCommission = (finalPrice * Number(commissionPercent || 0)) / 100;
      computedServicesJson = [
        {
          name: finalServiceName,
          price: finalPrice,
          durationMinutes: finalDuration,
          stylistName: stylistName?.trim() || undefined,
          commissionPercent: Number(commissionPercent || 0),
          commissionAmount: finalCommission,
        },
      ];
    }

    const targetDateStr = scheduledDate ? String(scheduledDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const dateObj = new Date(`${targetDateStr}T00:00:00.000Z`);

    // Determine Token Number for walk-ins if not provided
    let finalToken = tokenNumber?.trim() || null;
    if (isWalkIn && !finalToken) {
      const todayWalkinCount = await prisma.salonAppointment.count({
        where: {
          tenantId,
          isWalkIn: true,
          scheduledDate: {
            gte: new Date(`${targetDateStr}T00:00:00.000Z`),
            lte: new Date(`${targetDateStr}T23:59:59.999Z`),
          },
        },
      });
      finalToken = `W-${String(todayWalkinCount + 1).padStart(2, "0")}`;
    }

    // Default status: WAITING for walk-ins, BOOKED for scheduled appointments
    const initialStatus = isWalkIn ? SalonAppointmentStatus.WAITING : SalonAppointmentStatus.BOOKED;

    const appointment = await prisma.salonAppointment.create({
      data: {
        tenantId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        stylistName: stylistName?.trim() || null,
        chairNumber: chairNumber?.trim() || null,
        serviceName: finalServiceName,
        servicePrice: finalPrice,
        durationMinutes: finalDuration,
        scheduledDate: dateObj,
        scheduledTime: (scheduledTime || "10:00").trim(),
        status: initialStatus,
        notes: notes?.trim() || null,
        isWalkIn: Boolean(isWalkIn),
        tokenNumber: finalToken,
        servicesJson: computedServicesJson,
        clientHistory: clientHistory || undefined,
        tipAmount: Number(tipAmount || 0),
        totalCommission: finalCommission,
      },
    });

    return NextResponse.json({
      success: true,
      appointment,
      message: isWalkIn ? `Walk-in client registered (Token: ${finalToken})` : "Appointment slot booked successfully",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/salon/appointments error:", err);
    return NextResponse.json({ error: err.message || "Failed to book appointment" }, { status: 500 });
  }
}
