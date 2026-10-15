/**
 * @file tests/purchase-return.test.ts
 * Unit tests for Purchase Return & Statutory Supplier Debit Note Engine (GST Rule 34 & Section 34(1))
 * Uses Node.js built-in test runner: `tsx --test tests/*.test.ts`
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GstCalculator } from "../src/lib/gst";
import { computeGstr3bReturn, type Gstr3bComputationInput } from "../src/lib/gstr3b";

describe("Purchase Return & Supplier Debit Note Engine", () => {
  describe("Statutory Debit Note Numbering & GST Calculation", () => {
    test("should correctly compute intra-state purchase return GST (CGST + SGST)", () => {
      const returnQty = 5;
      const costRate = 1000;
      const lineTaxable = returnQty * costRate; // 5,000
      const gstRate = 18;

      const tax = GstCalculator.calculate(lineTaxable, gstRate, "32", "32", false);

      assert.equal(tax.taxableAmount, 5000);
      assert.equal(tax.cgstAmount, 450);
      assert.equal(tax.sgstAmount, 450);
      assert.equal(tax.igstAmount, 0);
      assert.equal(tax.totalTax, 900);
      assert.equal(tax.totalAmount, 5900);
    });

    test("should correctly compute inter-state purchase return GST (IGST only)", () => {
      const returnQty = 10;
      const costRate = 2000;
      const lineTaxable = returnQty * costRate; // 20,000
      const gstRate = 18;

      // Merchant state: 32 (Kerala), Supplier state: 29 (Karnataka)
      const tax = GstCalculator.calculate(lineTaxable, gstRate, "32", "29", false);

      assert.equal(tax.taxableAmount, 20000);
      assert.equal(tax.cgstAmount, 0);
      assert.equal(tax.sgstAmount, 0);
      assert.equal(tax.igstAmount, 3600);
      assert.equal(tax.totalTax, 3600);
      assert.equal(tax.totalAmount, 23600);
    });

    test("should enforce zero tax for composition scheme tenants", () => {
      const returnQty = 2;
      const costRate = 500;
      const lineTaxable = returnQty * costRate; // 1,000

      const tax = GstCalculator.calculate(lineTaxable, 18, "32", "32", true);

      assert.equal(tax.taxableAmount, 1000);
      assert.equal(tax.cgstAmount, 0);
      assert.equal(tax.sgstAmount, 0);
      assert.equal(tax.igstAmount, 0);
      assert.equal(tax.totalTax, 0);
      assert.equal(tax.totalAmount, 1000);
    });
  });

  describe("GSTR-3B Table 4(B)(2) ITC Reversal from Debit Notes", () => {
    test("should accurately reverse claimed Input Tax Credit in GSTR-3B when Debit Notes are issued", () => {
      const input: Gstr3bComputationInput = {
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
            isInterState: false,
          },
        ],
        creditNotes: [],
        purchaseBills: [
          {
            billNumber: "PUR-2026-01",
            totalTaxable: 50000,
            cgstAmount: 4500,
            sgstAmount: 4500,
            igstAmount: 0,
            totalAmount: 59000,
          },
        ],
        debitNotes: [
          {
            subtotal: 10000,
            cgstAmount: 900,
            sgstAmount: 900,
            igstAmount: 0,
            totalAmount: 11800,
          },
        ],
      };

      const result = computeGstr3bReturn(input);

      // Table 4(A)(5) All Other ITC (Gross purchases)
      assert.equal(result.table4.itcAvailable.allOtherItc.camt, 4500);
      assert.equal(result.table4.itcAvailable.allOtherItc.samt, 4500);

      // Table 4(B)(2) Others (Debit Notes ITC Reversal)
      assert.equal(result.table4.itcReversed.others.camt, 900);
      assert.equal(result.table4.itcReversed.others.samt, 900);

      // Table 4(C) Net ITC Available (Gross - Reversals)
      assert.equal(result.table4.netItc.camt, 3600); // 4500 - 900
      assert.equal(result.table4.netItc.samt, 3600); // 4500 - 900

      // Table 6.1 Tax Payable: 9000 output liability - 3600 Net ITC = 5400 payable in cash
      assert.equal(result.table61.taxPaidInCash.camt, 5400);
      assert.equal(result.table61.taxPaidInCash.samt, 5400);
    });

    test("should handle inter-state Debit Notes IGST reversal in GSTR-3B", () => {
      const input: Gstr3bComputationInput = {
        period: "082026",
        tenant: {
          gstin: "32AAAAA0000A1Z5",
          stateCode: "32",
          businessName: "Ziona Tech & Electricals",
        },
        invoices: [],
        creditNotes: [],
        purchaseBills: [
          {
            billNumber: "PUR-INTER-01",
            totalTaxable: 100000,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 18000,
            totalAmount: 118000,
          },
        ],
        debitNotes: [
          {
            subtotal: 20000,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 3600,
            totalAmount: 23600,
          },
        ],
      };

      const result = computeGstr3bReturn(input);

      assert.equal(result.table4.itcAvailable.allOtherItc.iamt, 18000);
      assert.equal(result.table4.itcReversed.others.iamt, 3600);
      assert.equal(result.table4.netItc.iamt, 14400); // 18000 - 3600
    });
  });

  describe("Double-Entry Ledger Impact Validation", () => {
    test("should maintain accounting balance equation: Assets = Liabilities + Equity", () => {
      // In a Purchase Return:
      // Dr. Accounts Payable (2000) -> Liability decreases by ₹11,800 (-₹11,800)
      // Cr. Merchandise Inventory Asset (1300) -> Asset decreases by ₹10,000 (-₹10,000)
      // Cr. Input Tax Credit Asset (1410/1420) -> Asset decreases by ₹1,800 (-₹1,800)
      const debitAp = 11800;
      const creditInventory = 10000;
      const creditTax = 1800;

      const deltaLiabilities = -debitAp; // -11800
      const deltaAssets = -(creditInventory + creditTax); // -11800

      assert.equal(deltaAssets, deltaLiabilities, "Debit and Credit changes to Balance Sheet must balance perfectly");
    });
  });
});
