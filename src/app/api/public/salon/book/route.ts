import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SalonAppointmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const CHAIR_STATIONS = [
  'Chair 1 - Hair & Styling',
  'Chair 2 - Hair & Beard',
  'Chair 3 - Coloring & Highlights',
  'Chair 4 - Blowdry & Wash',
  'Spa Suite A - Facial & Glow',
  'Spa Suite B - Body Massage & Scrub',
  'Nail Bar & Pedicure Station',
  'VIP Bridal / Groom Suite',
];

// POST /api/public/salon/book
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      slug,
      tenantId,
      clientName,
      clientPhone,
      scheduledDate,
      scheduledTime,
      stylistName,
      services, // Array<{ name, price, durationMinutes }>
      notes,
      consultationCard,
    } = body;

    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ success: false, error: 'Your name is required' }, { status: 400 });
    }
    if (!clientPhone || !clientPhone.trim()) {
      return NextResponse.json({ success: false, error: 'Mobile phone number is required' }, { status: 400 });
    }
    if (!scheduledDate || !scheduledTime) {
      return NextResponse.json({ success: false, error: 'Date and time slot are required' }, { status: 400 });
    }
    if (!Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one service must be selected' }, { status: 400 });
    }

    // Resolve tenant
    let targetTenant: any = null;
    if (tenantId) {
      targetTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    } else if (slug) {
      targetTenant = await prisma.tenant.findUnique({ where: { slug } });
    } else {
      targetTenant = await prisma.tenant.findFirst({ where: { businessType: 'SALON_SPA' } });
      if (!targetTenant) targetTenant = await prisma.tenant.findFirst();
    }

    if (!targetTenant) {
      return NextResponse.json({ success: false, error: 'Salon business not found' }, { status: 404 });
    }

    const dateStr = String(scheduledDate).slice(0, 10);
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    // Calculate totals
    const finalServiceName = services.map((s: any) => s.name).join(' + ');
    const finalPrice = services.reduce((sum: number, s: any) => sum + Number(s.price || 0), 0);
    const finalDuration = services.reduce((sum: number, s: any) => sum + Number(s.durationMinutes || 30), 0);

    // Resolve stylist
    const resolvedStylist =
      stylistName && stylistName !== 'Any Available Specialist' ? stylistName.trim() : 'Master Stylist';

    // Find already-occupied chairs at this exact date & time
    const occupiedAppointments = await prisma.salonAppointment.findMany({
      where: {
        tenantId: targetTenant.id,
        scheduledDate: {
          gte: dateObj,
          lte: new Date(`${dateStr}T23:59:59.999Z`),
        },
        scheduledTime: scheduledTime.trim(),
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { chairNumber: true, stylistName: true },
    });

    const occupiedChairs = new Set(occupiedAppointments.map((a) => a.chairNumber));

    // Choose first available chair station
    let assignedChair = CHAIR_STATIONS.find((c) => !occupiedChairs.has(c)) || CHAIR_STATIONS[0];

    // If specific service is spa or facial, prioritize Spa Suite
    if (finalServiceName.toLowerCase().includes('spa') || finalServiceName.toLowerCase().includes('massage')) {
      const spaSuite = CHAIR_STATIONS.find((c) => c.includes('Spa') && !occupiedChairs.has(c));
      if (spaSuite) assignedChair = spaSuite;
    } else if (finalServiceName.toLowerCase().includes('nail') || finalServiceName.toLowerCase().includes('pedicure')) {
      const nailStation = CHAIR_STATIONS.find((c) => c.includes('Nail') && !occupiedChairs.has(c));
      if (nailStation) assignedChair = nailStation;
    }

    // Generate unique booking code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingPassCode = `ZP-SALON-${randomSuffix}`;

    // Create appointment in database
    const appointment = await prisma.salonAppointment.create({
      data: {
        tenantId: targetTenant.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        stylistName: resolvedStylist,
        chairNumber: assignedChair,
        serviceName: finalServiceName,
        servicePrice: finalPrice,
        durationMinutes: finalDuration,
        scheduledDate: dateObj,
        scheduledTime: scheduledTime.trim(),
        status: SalonAppointmentStatus.BOOKED,
        notes: notes?.trim() || `Self-booked online (Ref: ${bookingPassCode})`,
        isWalkIn: false,
        servicesJson: services,
        clientHistory: consultationCard || undefined,
        tipAmount: 0,
        totalCommission: (finalPrice * 10) / 100, // 10% default
      },
    });

    // Compute suggested arrival time (5 minutes prior)
    const [h, m] = scheduledTime.split(':').map(Number);
    let arrH = h;
    let arrM = m - 5;
    if (arrM < 0) {
      arrH = Math.max(0, arrH - 1);
      arrM = 55;
    }
    const arrivalTime = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;

    return NextResponse.json({
      success: true,
      bookingCode: bookingPassCode,
      appointment: {
        id: appointment.id,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        stylistName: appointment.stylistName,
        chairNumber: appointment.chairNumber,
        serviceName: appointment.serviceName,
        servicePrice: Number(appointment.servicePrice),
        durationMinutes: appointment.durationMinutes,
        scheduledDate: dateStr,
        scheduledTime: appointment.scheduledTime,
        arrivalTime,
      },
      tenant: {
        name: targetTenant.businessName,
        phone: targetTenant.phone,
        address: targetTenant.address,
      },
      message: 'Zero-Wait Appointment confirmed successfully!',
    });
  } catch (err: any) {
    console.error('POST /api/public/salon/book error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to book appointment' }, { status: 500 });
  }
}
