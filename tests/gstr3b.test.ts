/**
 * @file tests/gstr3b.test.ts
 * Unit tests for GSTR-3B Statutory Return Preparation & Rule 88A Setoff Math
 * Uses Node.js built-in test runner: `tsx --test tests/*.test.ts`
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeGstr3bReturn, type Gstr3bComputationInput } from "../src/lib/gstr3b";

describe("GSTR-3B Statutory Return Preparation Engine", () => {
  const sampleInput: Gstr3bComputationInput = {
    period: "082026",
    tenant: {
      gstin: "32AAAAA0000A1Z5",
      stateCode: "32",
      businessName: "Ziona Tech & Electricals",
    },
    invoices: [
      {
        invoiceNumber: "INV-2026-0001",
        invoiceDate: "2026-08-05",
        subtotal: 100000,
        cgstAmount: 9000,
        sgstAmount: 9000,
        igstAmount: 0,
        totalAmount: 118000,
        customerGstin: "32AAACB2150P1Z1",
        customerStateCode: "32",
        isInterState: false,
      },
      {
        invoiceNumber: "INV-2026-0002",
        invoiceDate: "2026-08-10",
        subtotal: 50000,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 9000,
        totalAmount: 59000,
        customerGstin: null, // Unregistered inter-state -> Table 3.2
        customerStateCode: "29", // Karnataka
        isInterState: true,
      },
    ],
    creditNotes: [
      {
        subtotal: 10000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        totalAmount: 11800,
        isInterState: false,
      },
    ],
    purchaseBills: [
      {
        billNumber: "PUR-2026-01",
        totalTaxable: 60000,
        cgstAmount: 5400,
        sgstAmount: 5400,
        igstAmount: 3600,
        totalAmount: 74400,
      },
    ],
  };

  test("computes Table 3.1 net taxable and output tax deducting credit notes", () => {
    const report = computeGstr3bReturn(sampleInput);

    // Gross taxable = 100,000 + 50,000 = 150,000; Credit note = 10,000 -> Net = 140,000
    assert.equal(report.table31.taxableOutward.txval, 140000);

    // CGST: 9,000 - 900 = 8,100
    assert.equal(report.table31.taxableOutward.camt, 8100);

    // SGST: 9,000 - 900 = 8,100
    assert.equal(report.table31.taxableOutward.samt, 8100);

    // IGST: 9,000 - 0 = 9,000
    assert.equal(report.table31.taxableOutward.iamt, 9000);
  });

  test("populates Table 3.2 for inter-state supplies to unregistered persons", () => {
    const report = computeGstr3bReturn(sampleInput);

    assert.equal(report.table32.length, 1);
    assert.equal(report.table32[0].pos, "29");
    assert.equal(report.table32[0].txval, 50000);
    assert.equal(report.table32[0].iamt, 9000);
  });

  test("computes Table 4 Eligible ITC from purchase bills", () => {
    const report = computeGstr3bReturn(sampleInput);

    assert.equal(report.table4.netItc.iamt, 3600);
    assert.equal(report.table4.netItc.camt, 5400);
    assert.equal(report.table4.netItc.samt, 5400);
  });

  test("applies Rule 88A ITC setoff logic correctly", () => {
    const report = computeGstr3bReturn(sampleInput);

    // Output liabilities: IGST: 9000, CGST: 8100, SGST: 8100
    // ITC available: IGST: 3600, CGST: 5400, SGST: 5400

    // Step A: IGST credit (3600) fully utilized against IGST liability (9000)
    // Remaining IGST liability = 9000 - 3600 = 5400
    // CGST credit (5400) utilized against CGST liability (8100) -> Remaining CGST liability = 2700
    // SGST credit (5400) utilized against SGST liability (8100) -> Remaining SGST liability = 2700

    // Net Cash to pay: IGST: 5400, CGST: 2700, SGST: 2700 -> Total Cash = 10800
    assert.equal(report.table61.taxPaidInCash.iamt, 5400);
    assert.equal(report.table61.taxPaidInCash.camt, 2700);
    assert.equal(report.table61.taxPaidInCash.samt, 2700);
    assert.equal(report.table61.taxPaidInCash.total, 10800);
  });

  test("uses reconciled 2B ITC numbers when provided", () => {
    const inputWith2b = {
      ...sampleInput,
      reconciled2bItc: {
        igst: 5000,
        cgst: 6000,
        sgst: 6000,
      },
    };

    const report = computeGstr3bReturn(inputWith2b);
    assert.equal(report.table4.netItc.iamt, 5000);
    assert.equal(report.table4.netItc.camt, 6000);
    assert.equal(report.table4.netItc.samt, 6000);
  });
});
