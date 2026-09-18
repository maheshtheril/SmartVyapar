import test from "node:test";
import assert from "node:assert/strict";
import { GstCalculator } from "../src/lib/gst.js";
import { getIndianFinancialYear } from "../src/lib/invoice-sequence.js";
import { CreateCreditNoteSchema } from "../src/lib/schemas/credit-note.js";

test("GST Credit Notes & Sales Returns (GST Rule 53 / GSTR-1 Table 9B)", async (t) => {
  await t.test("Credit Note Numbering & Statutory Rule 53 Compliance", async (t) => {
    await t.test("should format credit note sequence with 'CN' prefix and IST FY", () => {
      const fy = getIndianFinancialYear(new Date("2026-09-18T10:00:00+05:30"));
      const sequenceNumber = 1;
      const paddedSerial = sequenceNumber.toString().padStart(4, "0");
      const creditNoteNumber = `CN-${fy.compact}-${paddedSerial}`;

      assert.equal(creditNoteNumber, "CN-2627-0001");
      // Rule 53 mandates maximum 16 characters for GST credit notes
      assert.ok(
        creditNoteNumber.length <= 16,
        `Credit Note number length (${creditNoteNumber.length}) exceeds 16 chars statutory limit`
      );
      assert.match(creditNoteNumber, /^CN-\d{4}-\d{4}$/);
    });
  });

  await t.test("GST Tax Reversal Calculations on Sales Return", async (t) => {
    await t.test("should split reversed tax into CGST and SGST for Intra-state return", () => {
      // 1 item returned @ ₹1,000 with 18% GST (Kerala to Kerala)
      const taxable = 1000;
      const rate = 18;
      const tax = GstCalculator.calculate(taxable, rate, "32", "32", false);

      assert.equal(tax.taxableAmount, 1000);
      assert.equal(tax.cgstRate, 9);
      assert.equal(tax.sgstRate, 9);
      assert.equal(tax.igstRate, 0);
      assert.equal(tax.cgstAmount, 90);
      assert.equal(tax.sgstAmount, 90);
      assert.equal(tax.igstAmount, 0);
      assert.equal(tax.totalTax, 180);
      assert.equal(tax.totalAmount, 1180);
    });

    await t.test("should apply 100% IGST for Inter-state return", () => {
      // 1 item returned @ ₹2,000 with 18% GST (Kerala to Tamil Nadu)
      const taxable = 2000;
      const rate = 18;
      const tax = GstCalculator.calculate(taxable, rate, "32", "33", false);

      assert.equal(tax.taxableAmount, 2000);
      assert.equal(tax.cgstRate, 0);
      assert.equal(tax.sgstRate, 0);
      assert.equal(tax.igstRate, 18);
      assert.equal(tax.cgstAmount, 0);
      assert.equal(tax.sgstAmount, 0);
      assert.equal(tax.igstAmount, 360);
      assert.equal(tax.totalTax, 360);
      assert.equal(tax.totalAmount, 2360);
    });

    await t.test("should suppress tax reversal under Composition scheme", () => {
      const taxable = 500;
      const tax = GstCalculator.calculate(taxable, 5, "32", "32", true);

      assert.equal(tax.totalTax, 0);
      assert.equal(tax.totalAmount, 500);
    });
  });

  await t.test("Zod Schema Validation for Credit Note Creation", async (t) => {
    await t.test("should reject credit note with empty items array", () => {
      const invalid = {
        invoiceId: "inv-123",
        reason: "SALES_RETURN",
        refundMode: "CASH",
        items: [],
      };
      const result = CreateCreditNoteSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) =>
            i.message.includes("At least one item must be returned")
          )
        );
      }
    });

    await t.test("should reject credit note item with zero or negative return quantity", () => {
      const invalid = {
        invoiceId: "inv-123",
        reason: "SALES_RETURN",
        refundMode: "CASH",
        items: [
          {
            productId: "prod-1",
            productName: "LED Bulb 9W",
            hsnCode: "8539",
            quantity: 0,
            unitPrice: 150,
          },
        ],
      };
      const result = CreateCreditNoteSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) =>
            i.message.includes("Return quantity must be strictly greater than 0")
          )
        );
      }
    });

    await t.test("should accept a valid Credit Note creation payload", () => {
      const valid = {
        invoiceId: "inv-123",
        reason: "SALES_RETURN",
        remarks: "Customer exchanged for different model",
        refundMode: "CREDIT",
        items: [
          {
            productId: "prod-1",
            invoiceItemId: "item-1",
            productName: "Havells Switch Socket",
            hsnCode: "8536",
            unitReturned: "PCS",
            quantity: 2,
            unitPrice: 120,
            conversionFactor: 1.0,
            gstRate: 18,
            restock: true,
          },
        ],
      };
      const result = CreateCreditNoteSchema.safeParse(valid);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.items[0].quantity, 2);
        assert.equal(result.data.reason, "SALES_RETURN");
        assert.equal(result.data.refundMode, "CREDIT");
      }
    });
  });

  await t.test("Customer Khata (Credit Ledger) Reversal Calculation", () => {
    const previousBalance = 1500.0;
    const creditRefundAmount = 236.0;
    const updatedBalance = Number((previousBalance - creditRefundAmount).toFixed(2));

    assert.equal(updatedBalance, 1264.0);
  });
});
