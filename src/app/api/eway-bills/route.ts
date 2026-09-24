import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/eway-bills - List all active & historical E-Way bills
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    // 1. Fetch from invoices that have transport details or E-Way Bill numbers
    const invoicesWithTransport = await prisma.invoice.findMany({
      where: {
        tenantId,
        OR: [
          { ewayBillNo: { not: null } },
          { transDistance: { not: null } },
          { vehicleNo: { not: null } },
        ],
        ...(query
          ? {
              OR: [
                { invoiceNumber: { contains: query, mode: "insensitive" } },
                { ewayBillNo: { contains: query, mode: "insensitive" } },
                { vehicleNo: { contains: query, mode: "insensitive" } },
                { customerName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });

    // 2. Fetch explicit records from EWayBillRecord
    const persistedEwbRecords = await prisma.eWayBillRecord.findMany({
      where: {
        tenantId,
        ...(query
          ? {
              OR: [
                { ewayBillNo: { contains: query, mode: "insensitive" } },
                { docNumber: { contains: query, mode: "insensitive" } },
                { vehicleNo: { contains: query, mode: "insensitive" } },
                { toTradeName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { ewayBillDate: "desc" },
      take: 100,
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { gstin: true, businessName: true, stateCode: true },
    });

    // Synthesize unified list
    const unifiedList = [
      ...invoicesWithTransport.map((inv) => {
        // Calculate standard validity: 1 day per 200 km (Rule 138(10))
        const dist = inv.transDistance || 50;
        const validDays = Math.max(1, Math.ceil(dist / 200));
        const created = inv.ewayBillDate || inv.invoiceDate;
        const validUpto = new Date(created.getTime() + validDays * 24 * 60 * 60 * 1000);
        const isExpired = new Date() > validUpto;

        return {
          id: inv.id,
          sourceType: "INVOICE",
          docId: inv.id,
          docNumber: inv.invoiceNumber,
          docDate: inv.invoiceDate,
          ewayBillNo: inv.ewayBillNo || `EWB-${inv.invoiceNumber.replace(/[^0-9]/g, "").padStart(12, "0").substring(0, 12)}`,
          ewayBillDate: inv.ewayBillDate || inv.invoiceDate,
          validUpto,
          isExpired,
          isSimulated: inv.ewayBillNo ? false : true,
          recipientName: inv.customerName,
          recipientGstin: inv.customerGstin || "URP",
          totalAmount: Number(inv.totalAmount || 0),
          taxAmount: Number(inv.totalTax || 0),
          vehicleNo: inv.vehicleNo || "KL-07-AB-1234",
          vehicleType: inv.vehicleType || "R",
          distanceKm: inv.transDistance || 50,
          transporterName: inv.transporterName || "Self / Counter Dispatch",
          status: isExpired ? "EXPIRED" : "ACTIVE",
        };
      }),
      ...persistedEwbRecords.map((ewb) => ({
        id: ewb.id,
        isSimulated: ewb.isSimulated,
        sourceType: "RECORD",
        docId: ewb.invoiceId || ewb.id,
        docNumber: ewb.docNumber,
        docDate: ewb.docDate,
        ewayBillNo: ewb.ewayBillNo,
        ewayBillDate: ewb.ewayBillDate,
        validUpto: ewb.validUpto,
        isExpired: new Date() > ewb.validUpto,
        recipientName: ewb.toTradeName,
        recipientGstin: ewb.toGstin || "URP",
        totalAmount: Number(ewb.totalValue || 0),
        taxAmount: 0,
        vehicleNo: ewb.vehicleNo || "NOT_ASSIGNED",
        vehicleType: ewb.vehicleType,
        distanceKm: ewb.distanceKm,
        transporterName: "Registered Transporter",
        status: ewb.status,
      })),
    ];

    const activeCount = unifiedList.filter((e) => e.status === "ACTIVE").length;
    const expiredCount = unifiedList.filter((e) => e.status === "EXPIRED").length;
    const highValueCount = unifiedList.filter((e) => e.totalAmount >= 50000).length;

    return NextResponse.json({
      success: true,
      records: unifiedList,
      metrics: {
        total: unifiedList.length,
        activeCount,
        expiredCount,
        highValueCount,
      },
      tenant,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching E-Way Bills:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch E-Way bills" }, { status: 500 });
  }
}
