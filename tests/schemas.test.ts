import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { indianPhoneSchema, gstinSchema } from "../src/lib/schemas/common";
import { CreateProductSchema } from "../src/lib/schemas/product";
import { CreateInvoiceSchema } from "../src/lib/schemas/invoice";

describe("Validation Schemas (Zod)", () => {
  describe("Indian Phone Number Schema", () => {
    it("should sanitize and accept valid 10-digit mobile number", () => {
      const parsed = indianPhoneSchema.parse("9876543210");
      assert.strictEqual(parsed, "9876543210");
    });

    it("should strip formatting, spaces, and +91 prefix", () => {
      const parsed = indianPhoneSchema.parse("+91 98765 43210");
      assert.strictEqual(parsed, "9876543210");
    });

    it("should reject numbers starting with invalid digit or wrong length", () => {
      assert.throws(() => indianPhoneSchema.parse("1234567890"));
      assert.throws(() => indianPhoneSchema.parse("98765"));
    });
  });

  describe("GSTIN Schema", () => {
    it("should accept valid 15-character statutory GSTIN", () => {
      const parsed = gstinSchema.parse("32AAAAA0000A1Z5");
      assert.strictEqual(parsed, "32AAAAA0000A1Z5");
    });

    it("should accept empty or null GSTIN for unregistered customers", () => {
      assert.strictEqual(gstinSchema.parse(""), "");
      assert.strictEqual(gstinSchema.parse(null), null);
    });

    it("should reject invalid GSTIN patterns", () => {
      assert.throws(() => gstinSchema.parse("INVALID_GSTIN_123"));
      assert.throws(() => gstinSchema.parse("12345"));
    });
  });

  describe("Product Schema", () => {
    it("should reject products where sellingPrice exceeds MRP (Legal Metrology Act)", () => {
      const invalidProduct = {
        name: "Premium Copper Wire",
        purchasePrice: 100,
        sellingPrice: 150,
        mrp: 120, // Lower than selling price!
      };

      const result = CreateProductSchema.safeParse(invalidProduct);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        const hasMrpError = result.error.issues.some((i) => i.path.includes("sellingPrice"));
        assert.ok(hasMrpError, "Should include sellingPrice MRP violation issue");
      }
    });

    it("should require altUnit and conversionFactor > 1 when hasAltUnit is true", () => {
      const missingAltUnit = {
        name: "LED Bulb Box",
        hasAltUnit: true,
        altUnit: "",
        purchasePrice: 50,
        sellingPrice: 80,
      };

      const result = CreateProductSchema.safeParse(missingAltUnit);
      assert.strictEqual(result.success, false);
    });
  });

  describe("Invoice Schema", () => {
    it("should reject invoices without line items", () => {
      const invalidInvoice = {
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        items: [],
      };

      const result = CreateInvoiceSchema.safeParse(invalidInvoice);
      assert.strictEqual(result.success, false);
    });

    it("should accept a valid complete invoice payload", () => {
      const validInvoice = {
        customerName: "Anil Kumar",
        customerPhone: "+91 98765 43210",
        customerStateCode: "32",
        paymentMode: "UPI",
        items: [
          {
            productId: "prod-123",
            quantity: 5,
            unitPrice: 200,
          },
        ],
      };

      const result = CreateInvoiceSchema.safeParse(validInvoice);
      assert.strictEqual(result.success, true);
    });
  });
});
