import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  COMMANDS,
  encodeText,
  formatTwoColumnRow,
  buildEscposReceipt,
  concatByteArrays,
} from "../src/lib/escpos";

describe("Silent Thermal ESC/POS Hardware Driver", () => {
  test("formatTwoColumnRow should format 32-char line properly", () => {
    const row = formatTwoColumnRow("Item A x1", "₹100.00", 32);
    assert.equal(row.length, 33); // 32 chars + \n
    assert.ok(row.startsWith("Item A x1"));
    assert.ok(row.trimEnd().endsWith("₹100.00"));
  });

  test("concatByteArrays should merge Uint8Arrays correctly", () => {
    const arr1 = new Uint8Array([1, 2]);
    const arr2 = new Uint8Array([3, 4, 5]);
    const merged = concatByteArrays([arr1, arr2]);
    assert.equal(merged.length, 5);
    assert.deepEqual(Array.from(merged), [1, 2, 3, 4, 5]);
  });

  test("buildEscposReceipt should construct complete binary stream with INIT and CUT", () => {
    const receipt = buildEscposReceipt({
      businessName: "Super Auto Spares",
      businessGstin: "32AAAAA0000A1Z5",
      invoiceNumber: "INV-2026-001",
      invoiceDate: "20/09/2026",
      customerName: "Rahul Sharma",
      items: [
        { name: "Brake Pad Front", quantity: 1, unitPrice: 850, total: 850 },
        { name: "Synthetic Oil 4L", quantity: 1, unitPrice: 2200, total: 2200 },
      ],
      subtotal: 3050,
      taxAmount: 549,
      totalAmount: 3599,
      paymentMethod: "UPI",
      paperWidth: "58mm",
    });

    assert.ok(receipt instanceof Uint8Array);
    assert.ok(receipt.length > 100);

    // Verify INIT command at the beginning: 0x1B 0x40
    assert.equal(receipt[0], 0x1b);
    assert.equal(receipt[1], 0x40);

    // Verify Paper Cut command at the end: 0x1D 0x56 66 0
    const len = receipt.length;
    assert.equal(receipt[len - 4], 0x1d);
    assert.equal(receipt[len - 3], 0x56);
    assert.equal(receipt[len - 2], 66);
    assert.equal(receipt[len - 1], 0);
  });
});
