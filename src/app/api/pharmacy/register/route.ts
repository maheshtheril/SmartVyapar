import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/pharmacy/register - Schedule H & H1 Statutory Drug Register
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const scheduleType = searchParams.get("schedule") || "ALL"; // "H", "H1", "ALL"
    const search = searchParams.get("q") || "";

    // Build filter for items
    const productWhere: any = {};
    if (scheduleType === "H1") {
      productWhere.isScheduleH1 = true;
    } else if (scheduleType === "H") {
      productWhere.isScheduleH = true;
    } else {
      productWhere.OR = [{ isScheduleH: true }, { isScheduleH1: true }];
    }

    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          tenantId,
          isCancelled: false,
        },
        product: productWhere,
        ...(search
          ? {
              OR: [
                { productName: { contains: search, mode: "insensitive" } },
                { batchNumber: { contains: search, mode: "insensitive" } },
                { invoice: { doctorName: { contains: search, mode: "insensitive" } } },
                { invoice: { patientName: { contains: search, mode: "insensitive" } } },
                { invoice: { invoiceNumber: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            doctorName: true,
            doctorRegNo: true,
            patientName: true,
            patientAge: true,
            patientGender: true,
            customerPhone: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            drugGenericName: true,
            dosageForm: true,
            isScheduleH: true,
            isScheduleH1: true,
            isNarcotic: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
          },
        },
      },
      orderBy: { invoice: { invoiceDate: "desc" } },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      registerEntries: items,
      count: items.length,
    });
  } catch (error: any) {
    console.error("Error fetching drug register:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
