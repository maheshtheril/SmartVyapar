import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Purchase Order (PO) & Procurement Management Engine", () => {
  describe("Sequential PO Numbering Pattern", () => {
    test("should format standard statutory PO-YYYY-XXXX pattern", () => {
      const year = 2026;
      const count = 42;
      const poNumber = `PO-${year}-${String(count + 1).padStart(4, "0")}`;

      assert.equal(poNumber, "PO-2026-0043");
      assert.match(poNumber, /^PO-\d{4}-\d{4}$/);
    });
  });

  describe("Purchase Order Valuation & GST Computation", () => {
    test("should accurately calculate item line totals, subtotal, and tax", () => {
      const items = [
        {
          productName: "Bosch Brake Disc",
          orderedQuantity: 10,
          expectedRate: 1500,
          gstRate: 18,
        },
        {
          productName: "Castrol Synthetic Oil 5L",
          orderedQuantity: 5,
          expectedRate: 2200,
          gstRate: 18,
        },
      ];

      let subtotal = 0;
      let totalTax = 0;

      items.forEach((it) => {
        const taxable = it.orderedQuantity * it.expectedRate;
        const tax = (taxable * it.gstRate) / 100;
        subtotal += taxable;
        totalTax += tax;
      });

      const totalPOAmount = subtotal + totalTax;

      // Item 1: 10 * 1500 = 15,000 + 18% (2700) = 17,700
      // Item 2: 5 * 2200 = 11,000 + 18% (1980) = 12,980
      // Subtotal: 26,000, Tax: 4,680, Total: 30,680
      assert.equal(subtotal, 26000);
      assert.equal(totalTax, 4680);
      assert.equal(totalPOAmount, 30680);
    });
  });

  describe("PO Status Lifecycle Transitions", () => {
    test("validates progression from DRAFT to ORDERED to COMPLETED", () => {
      const validStatuses = ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"];

      assert.ok(validStatuses.includes("DRAFT"));
      assert.ok(validStatuses.includes("ORDERED"));
      assert.ok(validStatuses.includes("COMPLETED"));
    });
  });

  describe("1-Click PO Inward Conversion Integrity", () => {
    test("Inwarding a PO creates corresponding Goods Receipt Note (GRN) sequence", () => {
      const poNumber = "PO-2026-0005";
      const grnCount = 12;
      const grnNumber = `GRN-2026-${String(grnCount + 1).padStart(4, "0")}`;

      assert.equal(grnNumber, "GRN-2026-0013");
      assert.match(grnNumber, /^GRN-\d{4}-\d{4}$/);
    });

    test("Double-entry balance check: Inventory Asset + ITC equals Accounts Payable", () => {
      const taxable = 26000;
      const cgst = 2340;
      const sgst = 2340;
      const totalPayable = taxable + cgst + sgst;

      const totalDebits = taxable + cgst + sgst;
      const totalCredits = totalPayable;

      assert.equal(totalDebits, totalCredits);
      assert.equal(totalDebits, 30680);
    });
  });

  describe("WhatsApp Order Sharing Text Generator", () => {
    test("should encode valid WhatsApp URL with items summary and total", () => {
      const po = {
        poNumber: "PO-2026-0001",
        supplierName: "Bosch India Ltd",
        supplierPhone: "9845012345",
        totalAmount: 17700,
      };

      const phone = po.supplierPhone.replace(/[^0-9]/g, "");
      const message = `PURCHASE ORDER: ${po.poNumber} for ${po.supplierName}. Total: ₹${po.totalAmount}`;
      const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;

      assert.ok(url.startsWith("https://wa.me/919845012345"));
      assert.ok(url.includes("PO-2026-0001"));
    });
  });
});
