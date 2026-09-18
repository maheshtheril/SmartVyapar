import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { generateOfficialGstr1Json, generateGstr3bSummary } from "@/lib/gstr1";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultPeriod = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    const period = searchParams.get("period") || defaultPeriod; // MMYYYY

    // Compute date boundaries for the selected period MMYYYY
    let startDate: Date;
    let endDate: Date;

    if (/^\d{6}$/.test(period)) {
      const m = parseInt(period.substring(0, 2), 10);
      const y = parseInt(period.substring(2, 6), 10);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      // Default to entire current calendar month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [tenant, invoices, creditNotes, purchases] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
      }),
      prisma.invoice.findMany({
        where: {
          tenantId,
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: true,
          customer: true,
        },
        orderBy: { invoiceDate: "asc" },
      }),
      prisma.creditNote.findMany({
        where: {
          tenantId,
          creditNoteDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: true,
          customer: true,
        },
        orderBy: { creditNoteDate: "asc" },
      }),
      prisma.purchaseBill.findMany({
        where: {
          tenantId,
          billDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Generate Official GSTN GSTR-1 Bulk Portal JSON
    const gstr1Payload = generateOfficialGstr1Json({
      tenant,
      invoices: invoices as any,
      creditNotes: creditNotes as any,
      returnPeriod: period,
    });

    // Generate CA-Ready GSTR-3B Tax Net Summary
    const gstr3bSummary = generateGstr3bSummary({
      invoices: invoices as any,
      creditNotes: creditNotes as any,
      purchases: purchases as any,
    });

    const gstinPrefix = tenant.gstin ? tenant.gstin.trim() : "UNREGISTERED";
    const filename = `${gstinPrefix}_GSTR1_${period}.json`;

    return NextResponse.json({
      success: true,
      period,
      filename,
      counts: {
        invoices: invoices.length,
        creditNotes: creditNotes.length,
        b2b: gstr1Payload.b2b.length,
        b2cs: gstr1Payload.b2cs.length,
        cdnr: gstr1Payload.cdnr.length,
        cdnur: gstr1Payload.cdnur.length,
        hsnLines: gstr1Payload.hsn.data.length,
      },
      gstr1Payload,
      gstr3bSummary,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Failed to generate GSTR-1 JSON:", error);
    return NextResponse.json(
      { error: "Failed to generate GSTR-1 Portal JSON" },
      { status: 500 }
    );
  }
}
