import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

// GET /api/restaurant/reservations?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { tenantId } = await requireRole(req, ['OWNER', 'MANAGER', 'STAFF']);

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');

  let where: any = { tenantId };
  if (dateStr) {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    where.reservedAt = { gte: start, lte: end };
  }

  const reservations = await prisma.tableReservation.findMany({
    where,
    orderBy: { reservedAt: 'asc' },
  });

  return NextResponse.json({ success: true, reservations });
}

// POST /api/restaurant/reservations — Create reservation or add to waitlist
export async function POST(req: NextRequest) {
  const { tenantId } = await requireRole(req, ['OWNER', 'MANAGER', 'STAFF']);

  const body = await req.json();
  const {
    customerName,
    customerPhone,
    guestCount = 2,
    reservedAt,
    tableId,
    notes,
    isWaitlist = false,
  } = body;

  if (!customerName?.trim()) {
    return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 });
  }
  if (!customerPhone?.trim()) {
    return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
  }
  if (!isWaitlist && !reservedAt) {
    return NextResponse.json({ success: false, error: 'Reservation date/time is required' }, { status: 400 });
  }

  const reservation = await prisma.tableReservation.create({
    data: {
      tenantId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      guestCount: Number(guestCount),
      reservedAt: isWaitlist ? new Date() : new Date(reservedAt),
      tableId: tableId || null,
      notes: notes?.trim() || null,
      status: isWaitlist ? 'WAITLIST' : 'PENDING',
    },
  });

  return NextResponse.json({ success: true, reservation });
}

// PATCH /api/restaurant/reservations — Update status (confirm, seat, cancel, complete)
export async function PATCH(req: NextRequest) {
  const { tenantId } = await requireRole(req, ['OWNER', 'MANAGER', 'STAFF']);

  const body = await req.json();
  const { id, status, tableId } = body;

  if (!id || !status) {
    return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 });
  }

  const valid = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'WAITLIST'];
  if (!valid.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }

  const reservation = await prisma.tableReservation.updateMany({
    where: { id, tenantId },
    data: {
      status,
      ...(tableId !== undefined ? { tableId } : {}),
    },
  });

  if (reservation.count === 0) {
    return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/restaurant/reservations?id=...
export async function DELETE(req: NextRequest) {
  const { tenantId } = await requireRole(req, ['OWNER', 'MANAGER']);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  await prisma.tableReservation.deleteMany({ where: { id, tenantId } });
  return NextResponse.json({ success: true });
}
