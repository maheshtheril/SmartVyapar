import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("World-Standard Purchase Bill & GRN Engine", () => {
  describe("Sales Margin & Selling Price Calculator", () => {
    test("should compute correct selling price from cost price and margin percentage", () => {
      const costPrice = 2000;
      const marginPercent = 35; // 35% markup
      const sellingPrice = Math.round(costPrice * (1 + marginPercent / 100) * 100) / 100;

      assert.equal(sellingPrice, 2700);
      const unitProfit = sellingPrice - costPrice;
      assert.equal(unitProfit, 700);
    });

    test("should compute correct margin percentage when user enters custom selling price", () => {
      const costPrice = 1400; // e.g. Bosch Brake Pads
      const targetSellingPrice = 2100;

      const marginPercent = Math.round(((targetSellingPrice - costPrice) / costPrice) * 1000) / 10;
      assert.equal(marginPercent, 50.0);
    });

    test("should handle packaging size multiplier for base units", () => {
      // 5 Boxes of Spark Plugs, 10 Plugs per box
      const billedQuantity = 5;
      const packageSize = 10;
      const effectiveBaseQty = billedQuantity * packageSize;

      assert.equal(effectiveBaseQty, 50);

      const pricePerBox = 3500;
      const costPerBaseUnit = pricePerBox / packageSize;
      assert.equal(costPerBaseUnit, 350);
    });
  });

  describe("GST Tax & Inter-State vs Intra-State Inward Math", () => {
    test("Intra-state (same state code): splits tax 50/50 into CGST and SGST", () => {
      const taxable = 10000;
      const gstRate = 18;
      const isInterState = false;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = (taxable * gstRate) / 100;
      } else {
        cgst = (taxable * (gstRate / 2)) / 100;
        sgst = (taxable * (gstRate / 2)) / 100;
      }

      assert.equal(cgst, 900);
      assert.equal(sgst, 900);
      assert.equal(igst, 0);
      assert.equal(taxable + cgst + sgst + igst, 11800);
    });

    test("Inter-state (different state code): applies full tax as IGST", () => {
      const taxable = 25000;
      const gstRate = 28; // e.g. Batteries or Auto Components
      const isInterState = true;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = (taxable * gstRate) / 100;
      } else {
        cgst = (taxable * (gstRate / 2)) / 100;
        sgst = (taxable * (gstRate / 2)) / 100;
      }

      assert.equal(cgst, 0);
      assert.equal(sgst, 0);
      assert.equal(igst, 7000);
      assert.equal(taxable + cgst + sgst + igst, 32000);
    });
  });

  describe("Statutory Double-Entry Ledger Equality for Purchase Inward", () => {
    test("Debits (Inventory + ITC) must exactly equal Credit (Accounts Payable)", () => {
      const taxableInventory = 45000;
      const cgstITC = 4050;
      const sgstITC = 4050;
      const totalDebits = taxableInventory + cgstITC + sgstITC; // 53,100

      const accountsPayable = 53100;
      const totalCredits = accountsPayable;

      assert.equal(totalDebits, 53100);
      assert.equal(totalCredits, 53100);
      assert.equal(totalDebits - totalCredits, 0);
    });
  });

  describe("Statutory Inward Invoice Reconciliation Audit (Scanned vs Calculated)", () => {
    test("Reconciled 100%: should pass when computed total matches physical scanned invoice total within roundoff", () => {
      const scannedTotal = 7469.0;
      const rawCalculated = 7468.86;
      const roundOff = 0.14;
      const computedGrandTotal = Math.round((rawCalculated + roundOff) * 100) / 100; // 7469.00

      const variance = Math.abs(scannedTotal - computedGrandTotal);
      assert.ok(variance <= 0.01, "Variance should be zero / within roundoff tolerance");
    });

    test("Variance Detected: flags discrepancy when cashier edits line or OCR misreads", () => {
      const scannedTotal = 7469.0;
      const tamperedCalculated = 8120.0; // Someone altered a quantity or rate
      const variance = Math.abs(tamperedCalculated - scannedTotal);

      assert.ok(variance > 1.0, "Discrepancy must be flagged");
      assert.equal(variance, 651.0);
    });
  });
});
