import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { computeGstr3bReturn } from "@/lib/gstr3b";

export const dynamic = "force-dynamic";

// GET /api/gst/gstr-3b?period=082026 - Compute live statutory GSTR-3B return
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultPeriod = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    const period = searchParams.get("period") || defaultPeriod; // MMYYYY

    let startDate: Date;
    let endDate: Date;

    if (/^\d{6}$/.test(period)) {
      const m = parseInt(period.substring(0, 2), 10);
      const y = parseInt(period.substring(2, 6), 10);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [tenant, invoices, creditNotes, purchases, reconciliation2b, savedReturn] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
      }),
      prisma.invoice.findMany({
        where: {
          tenantId,
          invoiceDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.creditNote.findMany({
        where: {
          tenantId,
          creditNoteDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.purchaseBill.findMany({
        where: {
          tenantId,
          billDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.gstr2bReconciliation.findUnique({
        where: {
          tenantId_returnPeriod: {
            tenantId,
            returnPeriod: period,
          },
        },
      }),
      prisma.gstr3bReturn.findUnique({
        where: {
          tenantId_returnPeriod: {
            tenantId,
            returnPeriod: period,
          },
        },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // If 2B reconciliation exists, use its matched eligible ITC numbers
    let reconciled2bItc: { igst: number; cgst: number; sgst: number } | undefined;
    if (reconciliation2b && reconciliation2b.resultsJson) {
      try {
        const parsed = JSON.parse(reconciliation2b.resultsJson);
        const rows = parsed.rows || [];
        let matchedIgst = 0;
        let matchedCgst = 0;
        let matchedSgst = 0;
        for (const r of rows) {
          if (r.status === "MATCHED" && r.itcAvailable !== false) {
            matchedCgst += Number(r.gstr2bTax ? r.gstr2bTax / 2 : 0);
            matchedSgst += Number(r.gstr2bTax ? r.gstr2bTax / 2 : 0);
          }
        }
        reconciled2bItc = { igst: matchedIgst, cgst: matchedCgst, sgst: matchedSgst };
      } catch (e) {
        // fallback to books
      }
    }

    const computedReport = computeGstr3bReturn({
      period,
      tenant: {
        gstin: tenant.gstin,
        stateCode: tenant.stateCode,
        businessName: tenant.businessName,
      },
      invoices: invoices as any,
      creditNotes: creditNotes as any,
      purchaseBills: purchases as any,
      reconciled2bItc,
    });

    return NextResponse.json({
      success: true,
      period,
      report: computedReport,
      savedReturn: savedReturn || null,
      metadata: {
        invoicesCount: invoices.length,
        creditNotesCount: creditNotes.length,
        purchaseBillsCount: purchases.length,
        has2bReconciliation: !!reconciliation2b,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GSTR-3B Computation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to compute GSTR-3B" }, { status: 500 });
  }
}

// POST /api/gst/gstr-3b - Save / lock GSTR-3B Return draft in database
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { period, report, filingStatus = "READY_TO_FILE" } = body;

    if (!period || !report) {
      return NextResponse.json({ error: "Missing period or report payload" }, { status: 400 });
    }

    const t31 = report.table31?.taxableOutward || {};
    const t4 = report.table4?.netItc || {};
    const t61 = report.table61?.taxPaidInCash || {};

    const saved = await prisma.gstr3bReturn.upsert({
      where: {
        tenantId_returnPeriod: {
          tenantId,
          returnPeriod: period,
        },
      },
      update: {
        filingStatus,
        table31Taxable: t31.txval || 0,
        table31Igst: t31.iamt || 0,
        table31Cgst: t31.camt || 0,
        table31Sgst: t31.samt || 0,
        table31Cess: t31.csamt || 0,

        table4ItcIgst: t4.iamt || 0,
        table4ItcCgst: t4.camt || 0,
        table4ItcSgst: t4.samt || 0,
        table4ItcCess: t4.csamt || 0,

        netCashIgst: t61.iamt || 0,
        netCashCgst: t61.camt || 0,
        netCashSgst: t61.samt || 0,
        totalCashPayable: t61.total || 0,

        payloadJson: JSON.stringify(report),
      },
      create: {
        tenantId,
        returnPeriod: period,
        financialYear: report.financialYear || "2026-2027",
        filingStatus,

        table31Taxable: t31.txval || 0,
        table31Igst: t31.iamt || 0,
        table31Cgst: t31.camt || 0,
        table31Sgst: t31.samt || 0,
        table31Cess: t31.csamt || 0,

        table4ItcIgst: t4.iamt || 0,
        table4ItcCgst: t4.camt || 0,
        table4ItcSgst: t4.samt || 0,
        table4ItcCess: t4.csamt || 0,

        netCashIgst: t61.iamt || 0,
        netCashCgst: t61.camt || 0,
        netCashSgst: t61.samt || 0,
        totalCashPayable: t61.total || 0,

        payloadJson: JSON.stringify(report),
      },
    });

    return NextResponse.json({
      success: true,
      message: `GSTR-3B return for period ${period} saved successfully`,
      savedReturn: saved,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GSTR-3B Save Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save GSTR-3B return" }, { status: 500 });
  }
}
