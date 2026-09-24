import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { JobCardStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    
    const jobCard = await prisma.jobCard.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
      include: {
        vehicle: {
          include: { customer: true }
        },
        items: {
          include: { product: true }
        }
      }
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    return NextResponse.json(jobCard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    const tenantId = session.tenantId;
    const body = await request.json();

    const { status, approvedEstimate, mechanicNotes, odometerReading } = body;

    const existingJobCard = await prisma.jobCard.findFirst({
      where: { id: params.id, tenantId }
    });

    if (!existingJobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (status && Object.values(JobCardStatus).includes(status)) {
      dataToUpdate.status = status;
    }
    
    // Optional Workflow Updates
    if (approvedEstimate !== undefined) dataToUpdate.approvedEstimate = approvedEstimate;
    if (mechanicNotes !== undefined) dataToUpdate.mechanicNotes = mechanicNotes;
    if (odometerReading !== undefined) dataToUpdate.odometerReading = Number(odometerReading);

    // If status moves to COMPLETED or DELIVERED, record completedAt / deliveredAt 
    if (status === JobCardStatus.COMPLETED && !existingJobCard.completedAt) {
      dataToUpdate.completedAt = new Date();
    }
    if (status === JobCardStatus.DELIVERED && !existingJobCard.deliveredAt) {
      dataToUpdate.deliveredAt = new Date();
    }

    const updated = await prisma.jobCard.update({
      where: { id: params.id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, jobCard: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
