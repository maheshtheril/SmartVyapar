import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  COMMANDS,
  encodeText,
  formatTwoColumnRow,
  buildEscposReceipt,
  buildEscposZReport,
  concatByteArrays,
  generateEscposBarcode,
} from "../src/lib/escpos";

describe("Silent Thermal ESC/POS Hardware Driver", () => {
  describe("Formatting & Buffer Operations", () => {
    test("formatTwoColumnRow should format 32-char line properly for 58mm", () => {
      const row = formatTwoColumnRow("Item A x1", "₹100.00", 32);
      assert.equal(row.length, 33); // 32 chars + \n
      assert.ok(row.startsWith("Item A x1"));
      assert.ok(row.trimEnd().endsWith("₹100.00"));
    });

    test("formatTwoColumnRow should format 48-char line properly for 80mm", () => {
      const row = formatTwoColumnRow("BOSCH BRAKE PAD FRONT x2", "₹3,400.00", 48);
      assert.equal(row.length, 49); // 48 chars + \n
      assert.ok(row.startsWith("BOSCH BRAKE PAD"));
      assert.ok(row.trimEnd().endsWith("₹3,400.00"));
    });

    test("concatByteArrays should merge Uint8Arrays correctly", () => {
      const arr1 = new Uint8Array([1, 2]);
      const arr2 = new Uint8Array([3, 4, 5]);
      const merged = concatByteArrays([arr1, arr2]);
      assert.equal(merged.length, 5);
      assert.deepEqual(Array.from(merged), [1, 2, 3, 4, 5]);
    });
  });

  describe("Barcode & Cash Drawer Commands", () => {
    test("generateEscposBarcode should construct valid Code-128 GS k command", () => {
      const barcode = generateEscposBarcode("INV-2026-0042");
      assert.ok(barcode instanceof Uint8Array);

      // Must contain GS (0x1D) followed by 'k' (0x6B) and 73 (Code-128)
      let foundBarcodeCmd = false;
      for (let i = 0; i < barcode.length - 2; i++) {
        if (barcode[i] === 0x1d && barcode[i + 1] === 0x6b && barcode[i + 2] === 73) {
          foundBarcodeCmd = true;
          break;
        }
      }
      assert.ok(foundBarcodeCmd, "Should contain Code-128 ESC/POS command");
    });

    test("COMMANDS.DRAWER_KICK should contain standard Epson RJ11 pulse", () => {
      // ESC p 0 25 250
      assert.deepEqual(Array.from(COMMANDS.DRAWER_KICK), [0x1b, 0x70, 0, 25, 250]);
    });
  });

  describe("Thermal Bill Receipt Construction", () => {
    test("buildEscposReceipt should construct complete binary stream with barcode and cut", () => {
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
        paperWidth: "80mm",
        includeBarcode: true,
        kickDrawer: true,
        loyaltyRedeemed: 50,
        loyaltyEarned: 35,
      });

      assert.ok(receipt instanceof Uint8Array);
      assert.ok(receipt.length > 200);

      // Verify drawer kick at start
      assert.equal(receipt[0], 0x1b);
      assert.equal(receipt[1], 0x70);

      // Verify INIT command right after
      assert.equal(receipt[5], 0x1b);
      assert.equal(receipt[6], 0x40);

      // Verify Paper Cut command at the end: 0x1D 0x56 66 0
      const len = receipt.length;
      assert.equal(receipt[len - 4], 0x1d);
      assert.equal(receipt[len - 3], 0x56);
      assert.equal(receipt[len - 2], 66);
      assert.equal(receipt[len - 1], 0);
    });
  });

  describe("End-of-Day Z-Report Construction", () => {
    test("buildEscposZReport should construct complete audit slip with reconciliation and cut", () => {
      const zReportStream = buildEscposZReport({
        businessName: "Ziona Auto Electricals",
        businessGstin: "32AAAAA0000A1Z5",
        shiftNumber: "SHIFT-2026-0001",
        openedAt: "21/09/2026, 09:00 AM",
        closedAt: "21/09/2026, 09:00 PM",
        openedByName: "Mahesh",
        billCount: 42,
        openingFloat: 2000,
        sales: {
          cash: 8500,
          upi: 14200,
          card: 6000,
          credit: 1200,
          gross: 29900,
        },
        payouts: {
          total: 250,
          items: [{ reason: "Tea & snacks", amount: 50 }, { reason: "Courier charges", amount: 200 }],
        },
        expectedCash: 10250,
        actualCash: 10250,
        variance: 0,
        paperWidth: "80mm",
      });

      assert.ok(zReportStream instanceof Uint8Array);
      assert.ok(zReportStream.length > 200);

      // Verify INIT command at beginning
      assert.equal(zReportStream[0], 0x1b);
      assert.equal(zReportStream[1], 0x40);

      // Verify Cut command at end
      const len = zReportStream.length;
      assert.equal(zReportStream[len - 4], 0x1d);
      assert.equal(zReportStream[len - 3], 0x56);
      assert.equal(zReportStream[len - 2], 66);
      assert.equal(zReportStream[len - 1], 0);
    });
  });
});
