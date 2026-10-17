import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { SalonAppointmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// PATCH /api/salon/appointments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id } = params;

    const body = await req.json();

    const existing = await prisma.salonAppointment.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const data: any = {};
    if (body.status && Object.values(SalonAppointmentStatus).includes(body.status)) {
      data.status = body.status;
    }
    if (body.clientName !== undefined) data.clientName = body.clientName.trim();
    if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone.trim();
    if (body.stylistName !== undefined) data.stylistName = body.stylistName?.trim() || null;
    if (body.chairNumber !== undefined) data.chairNumber = body.chairNumber?.trim() || null;
    if (body.serviceName !== undefined) data.serviceName = body.serviceName.trim();
    if (body.servicePrice !== undefined) data.servicePrice = Number(body.servicePrice || 0);
    if (body.durationMinutes !== undefined) data.durationMinutes = Number(body.durationMinutes || 30);
    if (body.scheduledDate !== undefined) {
      data.scheduledDate = new Date(`${String(body.scheduledDate).slice(0, 10)}T00:00:00.000Z`);
    }
    if (body.scheduledTime !== undefined) data.scheduledTime = body.scheduledTime.trim();
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.invoiceId !== undefined) data.invoiceId = body.invoiceId || null;

    const updated = await prisma.salonAppointment.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      appointment: updated,
      message: "Appointment updated successfully",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/salon/appointments/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to update appointment" }, { status: 500 });
  }
}

// DELETE /api/salon/appointments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id } = params;

    const existing = await prisma.salonAppointment.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await prisma.salonAppointment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/salon/appointments/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete appointment" }, { status: 500 });
  }
}
