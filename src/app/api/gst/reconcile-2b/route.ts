import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  parseGstr2bJson,
  reconcileGstr2bWithBooks,
  getSampleGstr2bJson,
  normalizeInvoiceNumber,
  BooksPurchaseRecord,
} from "@/lib/gstr2b-matcher";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json().catch(() => ({}));
    const { jsonContent, returnPeriod: reqPeriod, fileName = "gstr2b_portal.json", isSample = false } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessName: true, gstin: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantGstin = tenant.gstin || "32AAAAA0000A1Z5";
    const tenantName = tenant.businessName || "My Store";

    // 1. Ingest GSTR-2B JSON (uploaded or sample)
    let rawPayload: any;
    if (isSample) {
      rawPayload = getSampleGstr2bJson(tenantGstin, reqPeriod || "082026");
    } else if (typeof jsonContent === "string") {
      try {
        rawPayload = JSON.parse(jsonContent);
      } catch (e) {
        return NextResponse.json({ error: "Invalid JSON format. Please upload official GST Portal GSTR-2B JSON." }, { status: 400 });
      }
    } else if (jsonContent && typeof jsonContent === "object") {
      rawPayload = jsonContent;
    } else {
      return NextResponse.json({ error: "Missing GSTR-2B JSON payload" }, { status: 400 });
    }

    // 2. Parse Normalized Records from 2B
    const parsed2b = parseGstr2bJson(rawPayload);
    const returnPeriod = reqPeriod || parsed2b.returnPeriod || "082026";

    // 3. Fetch Books Purchase Bills for this tenant
    const purchaseBills = await prisma.purchaseBill.findMany({
      where: { tenantId },
      orderBy: { billDate: "desc" },
    });

    // Transform into standard BooksPurchaseRecord format
    const booksList: BooksPurchaseRecord[] = purchaseBills.map((pb) => {
      const cgst = Number(pb.cgstAmount || 0);
      const sgst = Number(pb.sgstAmount || 0);
      const igst = Number(pb.igstAmount || 0);
      const totalTax = cgst + sgst + igst;

      return {
        id: pb.id,
        billNumber: pb.billNumber,
        normalizedBillNum: normalizeInvoiceNumber(pb.billNumber),
        billDate: pb.billDate.toISOString(),
        supplierName: pb.supplierName,
        supplierGstin: pb.supplierGstin,
        taxableValue: Number(pb.totalTaxable || 0),
        cgst,
        sgst,
        igst,
        totalTax,
        totalAmount: Number(pb.totalAmount || 0),
      };
    });

    // 4. Run Cross-Matching Algorithm
    const report = reconcileGstr2bWithBooks(
      tenantName,
      tenantGstin,
      returnPeriod,
      parsed2b.records,
      booksList,
      2.0 // ₹2 tolerance
    );

    // 5. Upsert Reconciliation History into Database
    await prisma.gstr2bReconciliation.upsert({
      where: {
        tenantId_returnPeriod: {
          tenantId,
          returnPeriod,
        },
      },
      update: {
        fileName,
        total2bInvoices: report.summary.total2bInvoices,
        totalBooksInvoices: report.summary.totalBooksInvoices,
        matchedCount: report.summary.matchedCount,
        mismatchedCount: report.summary.mismatchedCount,
        missingIn2bCount: report.summary.missingIn2bCount,
        missingInBooksCount: report.summary.missingInBooksCount,
        matchedItc: report.summary.matchedItc,
        pendingItc: report.summary.pendingItc,
        ineligibleItc: report.summary.ineligibleItc,
        resultsJson: JSON.stringify(report),
        uploadedAt: new Date(),
      },
      create: {
        tenantId,
        returnPeriod,
        financialYear: report.financialYear,
        fileName,
        total2bInvoices: report.summary.total2bInvoices,
        totalBooksInvoices: report.summary.totalBooksInvoices,
        matchedCount: report.summary.matchedCount,
        mismatchedCount: report.summary.mismatchedCount,
        missingIn2bCount: report.summary.missingIn2bCount,
        missingInBooksCount: report.summary.missingInBooksCount,
        matchedItc: report.summary.matchedItc,
        pendingItc: report.summary.pendingItc,
        ineligibleItc: report.summary.ineligibleItc,
        resultsJson: JSON.stringify(report),
      },
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("GSTR-2B reconciliation failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reconcile GSTR-2B" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");

    if (period) {
      const rec = await prisma.gstr2bReconciliation.findUnique({
        where: {
          tenantId_returnPeriod: {
            tenantId,
            returnPeriod: period,
          },
        },
      });

      if (!rec) {
        return NextResponse.json({ success: true, report: null });
      }

      const parsedReport = JSON.parse(rec.resultsJson);
      return NextResponse.json({ success: true, report: parsedReport, record: rec });
    }

    // List all past reconciliation filings
    const history = await prisma.gstr2bReconciliation.findMany({
      where: { tenantId },
      orderBy: { returnPeriod: "desc" },
      select: {
        id: true,
        returnPeriod: true,
        financialYear: true,
        fileName: true,
        uploadedAt: true,
        matchedCount: true,
        mismatchedCount: true,
        missingIn2bCount: true,
        missingInBooksCount: true,
        matchedItc: true,
        pendingItc: true,
      },
    });

    // Also get the latest full report if available
    let latestReport = null;
    if (history.length > 0) {
      const latestRec = await prisma.gstr2bReconciliation.findUnique({
        where: { id: history[0].id },
      });
      if (latestRec?.resultsJson) {
        latestReport = JSON.parse(latestRec.resultsJson);
      }
    }

    return NextResponse.json({
      success: true,
      history,
      report: latestReport,
    });
  } catch (error: any) {
    console.error("Failed to fetch GSTR-2B history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reconciliation history" },
      { status: 500 }
    );
  }
}
