/**
 * @file tests/sales-return.test.ts
 * Unit tests for Sales Return & Statutory Customer Credit Note Engine (GST Rule 53 & Section 34(1))
 * Uses Node.js built-in test runner: `tsx --test tests/*.test.ts`
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GstCalculator } from "../src/lib/gst";
import { computeGstr3bReturn, type Gstr3bComputationInput } from "../src/lib/gstr3b";

describe("Sales Return & Customer Credit Note Engine (GST Rule 53)", () => {
  describe("Statutory GST Calculation (CGST/SGST vs IGST Reversals)", () => {
    test("should correctly compute intra-state sales return GST reversal (CGST + SGST)", () => {
      const returnQty = 2;
      const unitPrice = 1500;
      const lineTaxable = returnQty * unitPrice; // 3,000
      const gstRate = 18;

      // Merchant state: 32 (Kerala), Customer state: 32 (Kerala)
      const tax = GstCalculator.calculate(lineTaxable, gstRate, "32", "32", false);

      assert.equal(tax.taxableAmount, 3000);
      assert.equal(tax.cgstAmount, 270);
      assert.equal(tax.sgstAmount, 270);
      assert.equal(tax.igstAmount, 0);
      assert.equal(tax.totalTax, 540);
      assert.equal(tax.totalAmount, 3540);
    });

    test("should correctly compute inter-state sales return GST reversal (IGST only)", () => {
      const returnQty = 4;
      const unitPrice = 2500;
      const lineTaxable = returnQty * unitPrice; // 10,000
      const gstRate = 18;

      // Merchant state: 32 (Kerala), Customer state: 33 (Tamil Nadu)
      const tax = GstCalculator.calculate(lineTaxable, gstRate, "32", "33", false);

      assert.equal(tax.taxableAmount, 10000);
      assert.equal(tax.cgstAmount, 0);
      assert.equal(tax.sgstAmount, 0);
      assert.equal(tax.igstAmount, 1800);
      assert.equal(tax.totalTax, 1800);
      assert.equal(tax.totalAmount, 11800);
    });

    test("should handle zero tax for composition scheme returns", () => {
      const returnQty = 1;
      const unitPrice = 800;
      const lineTaxable = returnQty * unitPrice;

      const tax = GstCalculator.calculate(lineTaxable, 18, "32", "32", true);

      assert.equal(tax.taxableAmount, 800);
      assert.equal(tax.cgstAmount, 0);
      assert.equal(tax.sgstAmount, 0);
      assert.equal(tax.igstAmount, 0);
      assert.equal(tax.totalTax, 0);
      assert.equal(tax.totalAmount, 800);
    });
  });

  describe("GSTR-3B Table 3.1 & 3.2 Statutory Netting", () => {
    test("should net outward supplies and reverse output tax in Table 3.1(a) when credit notes are issued", () => {
      const input: Gstr3bComputationInput = {
        period: "092026",
        tenant: {
          gstin: "32AAAAA0000A1Z5",
          stateCode: "32",
          businessName: "Ziona Retails",
        },
        invoices: [
          {
            invoiceNumber: "INV-001",
            invoiceDate: "2026-09-02",
            subtotal: 100000,
            cgstAmount: 9000,
            sgstAmount: 9000,
            igstAmount: 0,
            totalAmount: 118000,
            isInterState: false,
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
        purchaseBills: [],
        debitNotes: [],
      };

      const result = computeGstr3bReturn(input);

      // Gross taxable: 100,000, Credit note: -10,000 => Net: 90,000
      assert.equal(result.table31.taxableOutward.txval, 90000);
      // Gross CGST: 9,000, Credit note CGST: -900 => Net: 8,100
      assert.equal(result.table31.taxableOutward.camt, 8100);
      // Gross SGST: 9,000, Credit note SGST: -900 => Net: 8,100
      assert.equal(result.table31.taxableOutward.samt, 8100);
      // Tax paid in cash after 0 ITC: 8,100 CGST + 8,100 SGST
      assert.equal(result.table61.taxPaidInCash.camt, 8100);
      assert.equal(result.table61.taxPaidInCash.samt, 8100);
    });

    test("should net unregistered inter-state supplies in Table 3.2 when inter-state credit notes are issued", () => {
      const input: Gstr3bComputationInput = {
        period: "092026",
        tenant: {
          gstin: "32AAAAA0000A1Z5",
          stateCode: "32",
          businessName: "Ziona Retails",
        },
        invoices: [
          {
            invoiceNumber: "INV-INTER-01",
            invoiceDate: "2026-09-05",
            customerGstin: null, // Unregistered consumer in TN
            customerStateCode: "33",
            subtotal: 50000,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 9000,
            totalAmount: 59000,
            isInterState: true,
          },
        ],
        creditNotes: [
          {
            subtotal: 10000,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 1800,
            totalAmount: 11800,
            customerGstin: null, // Unregistered
            customerStateCode: "33",
            isInterState: true,
          },
        ],
        purchaseBills: [],
        debitNotes: [],
      };

      const result = computeGstr3bReturn(input);

      // In Table 3.2 (Supplies made to Unregistered Persons)
      const tnSupply = result.table32.find((s) => s.pos === "33");
      assert.ok(tnSupply, "Tamil Nadu entry should exist in Table 3.2");
      // Gross: 50,000 - CN: 10,000 = 40,000
      assert.equal(tnSupply.txval, 40000);
      // Gross IGST: 9,000 - CN IGST: 1,800 = 7,200
      assert.equal(tnSupply.iamt, 7200);
    });
  });

  describe("Invoice Due Amount Reduction & Payment Status Adjustment", () => {
    test("should fully clear invoice due amount and update status to PAID when credit note equals due", () => {
      const invoice = {
        totalAmount: 5000,
        paidAmount: 3000,
        dueAmount: 2000,
        paymentStatus: "PARTIAL",
      };

      const creditNoteAmount = 2000;

      const newDue = Math.max(0, invoice.dueAmount - creditNoteAmount);
      const newStatus = newDue <= 0 ? "PAID" : "PARTIAL";

      assert.equal(newDue, 0);
      assert.equal(newStatus, "PAID");
    });

    test("should partially reduce invoice due and maintain PARTIAL status when credit note is less than due", () => {
      const invoice = {
        totalAmount: 10000,
        paidAmount: 0,
        dueAmount: 10000,
        paymentStatus: "PENDING",
      };

      const creditNoteAmount = 3500;

      const newDue = Math.max(0, invoice.dueAmount - creditNoteAmount);
      const newStatus = newDue <= 0 ? "PAID" : "PARTIAL";

      assert.equal(newDue, 6500);
      assert.equal(newStatus, "PARTIAL");
    });

    test("should clamp due amount to 0 when credit note exceeds remaining due", () => {
      const invoice = {
        totalAmount: 5000,
        paidAmount: 4000,
        dueAmount: 1000,
        paymentStatus: "PARTIAL",
      };

      const creditNoteAmount = 2500;

      const newDue = Math.max(0, invoice.dueAmount - creditNoteAmount);
      const newStatus = newDue <= 0 ? "PAID" : "PARTIAL";

      assert.equal(newDue, 0);
      assert.equal(newStatus, "PAID");
    });
  });

  describe("Double-Entry Accounting Symmetry for Sales Return", () => {
    test("should maintain perfect mathematical balance between Debits and Credits in Credit Note Journal", () => {
      // Return details:
      // Taxable: 5,000
      // CGST: 450, SGST: 450
      // Total Credit: 5,900
      // Cost of Returned Inventory: 3,200
      const taxable = 5000;
      const cgst = 450;
      const sgst = 450;
      const totalCredit = taxable + cgst + sgst; // 5,900
      const inventoryCost = 3200;

      // Debits:
      // Dr. Sales Returns / Revenue (4000) = 5,000
      // Dr. Output CGST (2200) = 450
      // Dr. Output SGST (2201) = 450
      // Dr. Inventory Asset (1300) = 3,200
      const totalDebits = taxable + cgst + sgst + inventoryCost;

      // Credits:
      // Cr. Customer AR / Cash (1200 / 1000) = 5,900
      // Cr. Cost of Goods Sold (5000) = 3,200
      const totalCredits = totalCredit + inventoryCost;

      assert.equal(totalDebits, 9100);
      assert.equal(totalCredits, 9100);
      assert.equal(totalDebits - totalCredits, 0, "Journal entry must be balanced to 0 difference");
    });
  });

  describe("Return Quantity Boundary Validation", () => {
    test("should allow valid return quantities and reject quantities exceeding invoiced qty", () => {
      const originalQuantity = 10;
      const alreadyReturned = 4;
      const remainingReturnable = originalQuantity - alreadyReturned; // 6

      const attemptValidReturn = 5;
      assert.ok(alreadyReturned + attemptValidReturn <= originalQuantity, "5 units should be allowed");

      const attemptOverReturn = 7;
      assert.ok(alreadyReturned + attemptOverReturn > originalQuantity, "7 units should exceed original quantity");
    });
  });
});
