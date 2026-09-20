import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { generateOfficialGstr1Json } from "@/lib/gstr1";
import { submitGstr1ToGsp, GspCredentials } from "@/lib/gsp-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const defaultPeriod = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    const period = body.period || defaultPeriod; // MMYYYY

    // Date range calculation
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

    const [tenant, invoices, creditNotes] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.invoice.findMany({
        where: {
          tenantId,
          invoiceDate: { gte: startDate, lte: endDate },
        },
        include: { items: true, customer: true },
        orderBy: { invoiceDate: "asc" },
      }),
      prisma.creditNote.findMany({
        where: {
          tenantId,
          creditNoteDate: { gte: startDate, lte: endDate },
        },
        include: { items: true, customer: true },
        orderBy: { creditNoteDate: "asc" },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Generate statutory GSTR-1 payload
    const gstr1Payload = generateOfficialGstr1Json({
      tenant,
      invoices: invoices as any,
      creditNotes: creditNotes as any,
      returnPeriod: period,
    });

    // Determine credentials from body or tenant settings (fallback to sandbox simulator)
    const creds: GspCredentials = {
      provider: body.provider || "SANDBOX_SIMULATOR",
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      username: body.username,
      password: body.password,
      gstin: tenant.gstin || undefined,
      isSandbox: body.isSandbox ?? true,
    };

    const filingResult = await submitGstr1ToGsp(gstr1Payload, creds);

    return NextResponse.json({
      success: filingResult.success,
      period,
      arn: filingResult.arn,
      filingDate: filingResult.filingDate,
      status: filingResult.status,
      referenceId: filingResult.referenceId,
      details: filingResult.details,
      error: filingResult.error,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Direct GST filing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit GST return via GSP" },
      { status: 500 }
    );
  }
}
