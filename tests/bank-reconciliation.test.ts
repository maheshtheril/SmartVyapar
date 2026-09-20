import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseBankStatementCsv,
  reconcileStatements,
  normalizeCsvDate,
  BankStatementRow,
  BookLedgerRow,
} from "../src/lib/bank-reconciliation";

describe("Automated Bank Reconciliation Statement (BRS) Engine", () => {
  test("normalizeCsvDate should handle DD/MM/YYYY format correctly", () => {
    assert.equal(normalizeCsvDate("20/09/2026"), "2026-09-20");
    assert.equal(normalizeCsvDate("05-04-2026"), "2026-04-05");
    assert.equal(normalizeCsvDate("2026-09-20"), "2026-09-20");
  });

  test("parseBankStatementCsv should parse standard bank CSV format", () => {
    const csv = `Date,Narration,Ref No,Withdrawal,Deposit,Balance
20/09/2026,UPI PAYMENT TO SUPPLIER,UPI998811,1500.00,,48500.00
20/09/2026,CUSTOMER NEFT RECEIVED,NEFT12345,,12500.00,61000.00`;

    const rows = parseBankStatementCsv(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].date, "2026-09-20");
    assert.equal(rows[0].debit, 1500);
    assert.equal(rows[0].credit, 0);
    assert.equal(rows[0].referenceNo, "UPI998811");

    assert.equal(rows[1].credit, 12500);
    assert.equal(rows[1].debit, 0);
    assert.equal(rows[1].referenceNo, "NEFT12345");
  });

  test("reconcileStatements should match bank credits to book debits and vice-versa", () => {
    const statementRows: BankStatementRow[] = [
      {
        id: "s1",
        date: "2026-09-20",
        description: "Customer Payment",
        referenceNo: "NEFT12345",
        debit: 0,
        credit: 5000,
        status: "UNMATCHED",
      },
      {
        id: "s2",
        date: "2026-09-20",
        description: "Vendor Cheque Cleared",
        referenceNo: "CHQ001",
        debit: 2000,
        credit: 0,
        status: "UNMATCHED",
      },
      {
        id: "s3",
        date: "2026-09-21",
        description: "Bank SMS Charges",
        referenceNo: "",
        debit: 59,
        credit: 0,
        status: "UNMATCHED",
      },
    ];

    const bookRows: BookLedgerRow[] = [
      {
        id: "b1",
        date: "2026-09-20",
        description: "Sales Receipt Rahul",
        referenceNo: "NEFT12345",
        debit: 5000, // Book debit = Cash/Bank in
        credit: 0,
        status: "UNMATCHED",
      },
      {
        id: "b2",
        date: "2026-09-19",
        description: "Payment to Bosch Parts",
        referenceNo: "CHQ001",
        debit: 0,
        credit: 2000, // Book credit = Cash/Bank out
        status: "UNMATCHED",
      },
    ];

    const report = reconcileStatements(statementRows, bookRows, 3);

    assert.equal(report.matchedCount, 2);
    assert.equal(report.unmatchedBankCount, 1); // s3 (Bank charges not yet booked)
    assert.equal(report.unmatchedBooksCount, 0);
    assert.equal(report.statementRows[0].status, "MATCHED");
    assert.equal(report.statementRows[1].status, "MATCHED");
    assert.equal(report.statementRows[2].status, "UNMATCHED");
  });
});
