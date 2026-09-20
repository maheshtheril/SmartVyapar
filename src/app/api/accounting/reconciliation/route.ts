import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAccountStatement } from "@/lib/accounting-reports";
import { parseBankStatementCsv, reconcileStatements, BankStatementRow, BookLedgerRow } from "@/lib/bank-reconciliation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { accountId, csvContent, toleranceDays = 3 } = body;

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required." }, { status: 400 });
    }

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "csvContent string is required." }, { status: 400 });
    }

    // 1. Parse uploaded Bank Statement CSV
    const statementRows = parseBankStatementCsv(csvContent);
    if (statementRows.length === 0) {
      return NextResponse.json(
        { error: "Could not find any valid debit/credit transactions in the uploaded CSV." },
        { status: 400 }
      );
    }

    // 2. Fetch General Ledger transactions for the selected Bank Account
    const statementReport = await getAccountStatement(tenantId, accountId, {});
    const bookRows: BookLedgerRow[] = (statementReport.transactions || []).map((line: any) => ({
      id: line.id,
      date: line.date.substring(0, 10),
      description: line.narration || `${line.voucherType} ${line.voucherNumber}`,
      referenceNo: line.referenceNo || line.voucherNumber,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      status: "UNMATCHED",
    }));

    // 3. Perform automated reconciliation
    const report = reconcileStatements(statementRows, bookRows, Number(toleranceDays) || 3);

    return NextResponse.json({
      success: true,
      account: statementReport.account,
      bookBalance: statementReport.closingBalance,
      report,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Bank Reconciliation Error:", error);
    return NextResponse.json({ error: error.message || "Reconciliation failed" }, { status: 500 });
  }
}
