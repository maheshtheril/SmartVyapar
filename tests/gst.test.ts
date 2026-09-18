import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GstCalculator } from "../src/lib/gst";

describe("Indian GST Engine (GstCalculator)", () => {
  it("should split tax 50-50 into CGST and SGST for Intra-state sale (same state)", () => {
    // ₹10,000 at 18% in Kerala (32) to Kerala (32)
    const result = GstCalculator.calculate(10000, 18, "32", "32");

    assert.strictEqual(result.taxType, "INTRA-STATE (CGST + SGST)");
    assert.strictEqual(result.taxableAmount, 10000);
    assert.strictEqual(result.gstRate, 18);
    assert.strictEqual(result.cgstRate, 9);
    assert.strictEqual(result.cgstAmount, 900);
    assert.strictEqual(result.sgstRate, 9);
    assert.strictEqual(result.sgstAmount, 900);
    assert.strictEqual(result.igstRate, 0);
    assert.strictEqual(result.igstAmount, 0);
    assert.strictEqual(result.totalTax, 1800);
    assert.strictEqual(result.totalAmount, 11800);
  });

  it("should default to Intra-state when customerStateCode is not provided", () => {
    const result = GstCalculator.calculate(5000, 12, "32", undefined);

    assert.strictEqual(result.taxType, "INTRA-STATE (CGST + SGST)");
    assert.strictEqual(result.cgstAmount, 300);
    assert.strictEqual(result.sgstAmount, 300);
    assert.strictEqual(result.totalTax, 600);
    assert.strictEqual(result.totalAmount, 5600);
  });

  it("should apply 100% IGST for Inter-state sale (different states)", () => {
    // Seller in Kerala (32), Buyer in Tamil Nadu (33)
    const result = GstCalculator.calculate(10000, 18, "32", "33");

    assert.strictEqual(result.taxType, "INTER-STATE (IGST)");
    assert.strictEqual(result.cgstAmount, 0);
    assert.strictEqual(result.sgstAmount, 0);
    assert.strictEqual(result.igstRate, 18);
    assert.strictEqual(result.igstAmount, 1800);
    assert.strictEqual(result.totalTax, 1800);
    assert.strictEqual(result.totalAmount, 11800);
  });

  it("should suppress tax under Composition / Non-GST Bill of Supply", () => {
    const result = GstCalculator.calculate(5000, 18, "32", "32", true);

    assert.strictEqual(result.taxType, "EXEMPT / NON-GST");
    assert.strictEqual(result.totalTax, 0);
    assert.strictEqual(result.cgstAmount, 0);
    assert.strictEqual(result.sgstAmount, 0);
    assert.strictEqual(result.igstAmount, 0);
    assert.strictEqual(result.totalAmount, 5000);
  });

  it("should correctly compute GSTR-3B Net Tax Payable (Output Tax - Input Credit)", () => {
    // Sales output: ₹1800 tax collected; Purchases input credit: ₹1200 paid
    const payable = GstCalculator.calculateNetPayable(
      { cgst: 900, sgst: 900, igst: 0 },
      { cgst: 600, sgst: 600, igst: 0 }
    );

    assert.strictEqual(payable.outputTax, 1800);
    assert.strictEqual(payable.inputTaxCredit, 1200);
    assert.strictEqual(payable.netPayable, 600);
    assert.strictEqual(payable.status, "TAX_PAYABLE");

    // Excess credit scenario (more purchase tax than sales tax)
    const creditCarryForward = GstCalculator.calculateNetPayable(
      { cgst: 500, sgst: 500, igst: 0 },
      { cgst: 800, sgst: 800, igst: 0 }
    );

    assert.strictEqual(creditCarryForward.netPayable, 0);
    assert.strictEqual(creditCarryForward.status, "CREDIT_CARRY_FORWARD");
  });
});
