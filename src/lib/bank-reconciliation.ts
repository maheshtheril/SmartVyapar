/**
 * Automated Bank Reconciliation Statement (BRS) Engine
 * Matches bank statement transactions against ERP General Ledger journal entries.
 */

export interface BankStatementRow {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  referenceNo?: string;
  debit: number; // Withdrawal from bank
  credit: number; // Deposit into bank
  balance?: number;
  matchedLedgerId?: string;
  status: "MATCHED" | "UNMATCHED";
}

export interface BookLedgerRow {
  id: string;
  date: string;
  description: string;
  referenceNo?: string;
  debit: number; // Book debit = Cash/Bank increase (Deposit)
  credit: number; // Book credit = Cash/Bank decrease (Payment)
  matchedStatementId?: string;
  status: "MATCHED" | "UNMATCHED";
}

export interface ReconciliationReport {
  bankBalance: number;
  bookBalance: number;
  matchedCount: number;
  unmatchedBankCount: number;
  unmatchedBooksCount: number;
  variance: number;
  statementRows: BankStatementRow[];
  bookRows: BookLedgerRow[];
}

/**
 * Parses CSV text into standardized BankStatementRow objects
 */
export function parseBankStatementCsv(csvText: string): BankStatementRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  
  // Find column indices
  const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("txn date"));
  const descIdx = headers.findIndex((h) => h.includes("desc") || h.includes("narration") || h.includes("particular"));
  const refIdx = headers.findIndex((h) => h.includes("ref") || h.includes("cheque") || h.includes("utr") || h.includes("chq"));
  const debitIdx = headers.findIndex((h) => h.includes("debit") || h.includes("withdrawal") || h.includes("dr"));
  const creditIdx = headers.findIndex((h) => h.includes("credit") || h.includes("deposit") || h.includes("cr"));
  const balIdx = headers.findIndex((h) => h.includes("balance") || h.includes("bal"));

  const rows: BankStatementRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length < 2) continue;

    const rawDate = dateIdx >= 0 ? cols[dateIdx] : cols[0];
    const desc = descIdx >= 0 ? cols[descIdx] : "Bank Transaction";
    const ref = refIdx >= 0 ? cols[refIdx] : "";
    const debit = debitIdx >= 0 ? parseFloat(cols[debitIdx].replace(/[^0-9.-]/g, "")) || 0 : 0;
    const credit = creditIdx >= 0 ? parseFloat(cols[creditIdx].replace(/[^0-9.-]/g, "")) || 0 : 0;
    const bal = balIdx >= 0 ? parseFloat(cols[balIdx].replace(/[^0-9.-]/g, "")) || 0 : 0;

    if (debit === 0 && credit === 0) continue;

    rows.push({
      id: `stmt_row_${i}`,
      date: normalizeCsvDate(rawDate),
      description: desc,
      referenceNo: ref,
      debit,
      credit,
      balance: bal,
      status: "UNMATCHED",
    });
  }

  return rows;
}

/**
 * Normalizes varied bank date strings (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) to YYYY-MM-DD
 */
export function normalizeCsvDate(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const cleaned = rawDate.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = cleaned.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  return cleaned;
}

/**
 * Reconciles bank statement lines against general ledger entries
 * Matching Rules:
 * Note: Bank Debit (withdrawal) matches Book Credit (payment)
 *       Bank Credit (deposit) matches Book Debit (receipt)
 */
export function reconcileStatements(
  statementRows: BankStatementRow[],
  bookRows: BookLedgerRow[],
  dateToleranceDays: number = 3
): ReconciliationReport {
  const sRows = statementRows.map((r) => ({ ...r }));
  const bRows = bookRows.map((r) => ({ ...r }));

  let matchedCount = 0;

  for (const s of sRows) {
    if (s.status === "MATCHED") continue;

    const sDate = new Date(s.date).getTime();

    // Try finding matching book entry
    const matchIndex = bRows.findIndex((b) => {
      if (b.status === "MATCHED") return false;

      // Check Reference No exact match first if present
      if (s.referenceNo && b.referenceNo && s.referenceNo.trim() === b.referenceNo.trim()) {
        return true;
      }

      // Check Amount equivalence (Bank debit == Book credit OR Bank credit == Book debit)
      const amountMatch =
        (s.debit > 0 && Math.abs(s.debit - b.credit) < 0.01) ||
        (s.credit > 0 && Math.abs(s.credit - b.debit) < 0.01);

      if (!amountMatch) return false;

      // Check Date within tolerance window
      const bDate = new Date(b.date).getTime();
      const diffDays = Math.abs(sDate - bDate) / (1000 * 60 * 60 * 24);
      return diffDays <= dateToleranceDays;
    });

    if (matchIndex >= 0) {
      const b = bRows[matchIndex];
      s.status = "MATCHED";
      s.matchedLedgerId = b.id;
      b.status = "MATCHED";
      b.matchedStatementId = s.id;
      matchedCount++;
    }
  }

  // Calculate totals
  const totalBankDebits = sRows.reduce((acc, r) => acc + r.debit, 0);
  const totalBankCredits = sRows.reduce((acc, r) => acc + r.credit, 0);
  const calculatedBankBalance = totalBankCredits - totalBankDebits;

  const totalBookDebits = bRows.reduce((acc, r) => acc + r.debit, 0);
  const totalBookCredits = bRows.reduce((acc, r) => acc + r.credit, 0);
  const calculatedBookBalance = totalBookDebits - totalBookCredits;

  const unmatchedBank = sRows.filter((r) => r.status === "UNMATCHED");
  const unmatchedBooks = bRows.filter((r) => r.status === "UNMATCHED");

  const variance = Number((calculatedBankBalance - calculatedBookBalance).toFixed(2));

  return {
    bankBalance: Number(calculatedBankBalance.toFixed(2)),
    bookBalance: Number(calculatedBookBalance.toFixed(2)),
    matchedCount,
    unmatchedBankCount: unmatchedBank.length,
    unmatchedBooksCount: unmatchedBooks.length,
    variance,
    statementRows: sRows,
    bookRows: bRows,
  };
}
