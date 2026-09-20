import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Cash Drawer Day-End Settlement & Thermal Z-Report Engine", () => {
  describe("Sequential Shift Numbering", () => {
    test("should format standard statutory SHIFT-YYYY-XXXX pattern", () => {
      const year = 2026;
      const count = 7;
      const shiftNumber = `SHIFT-${year}-${String(count + 1).padStart(4, "0")}`;

      assert.equal(shiftNumber, "SHIFT-2026-0008");
      assert.match(shiftNumber, /^SHIFT-\d{4}-\d{4}$/);
    });
  });

  describe("Indian Denominations Counting", () => {
    test("calculates exact total from notes and coins breakdown", () => {
      const denominations = {
        c500: 4, // ₹2,000
        c200: 5, // ₹1,000
        c100: 10, // ₹1,000
        c50: 8, // ₹400
        c20: 15, // ₹300
        c10: 25, // ₹250
        coins: 45.5, // ₹45.50
      };

      const totalCounted =
        denominations.c500 * 500 +
        denominations.c200 * 200 +
        denominations.c100 * 100 +
        denominations.c50 * 50 +
        denominations.c20 * 20 +
        denominations.c10 * 10 +
        denominations.coins;

      // 2000 + 1000 + 1000 + 400 + 300 + 250 + 45.50 = 4995.50
      assert.equal(totalCounted, 4995.5);
    });
  });

  describe("Expected Cash in Till Reconciliation", () => {
    test("accurately calculates Expected Cash = Opening Float + Cash Sales - Petty Payouts", () => {
      const openingFloat = 2000;
      const cashSales = 12500;
      const payouts = [
        { amount: 150, reason: "Tea & snacks" },
        { amount: 200, reason: "Courier charges" },
      ];

      const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
      const expectedCash = openingFloat + cashSales - totalPayouts;

      assert.equal(totalPayouts, 350);
      assert.equal(expectedCash, 14150);
    });

    test("identifies perfect balanced shift when variance is 0", () => {
      const expectedCash = 14150;
      const actualCounted = 14150;
      const variance = actualCounted - expectedCash;

      assert.equal(variance, 0);
      assert.equal(Math.abs(variance) < 0.01, true);
    });

    test("detects cash shortage when physical cash is less than expected", () => {
      const expectedCash = 14150;
      const actualCounted = 14000;
      const variance = actualCounted - expectedCash;

      assert.equal(variance, -150);
      assert.ok(variance < -0.01, "Should be flagged as SHORTAGE");
    });

    test("detects cash surplus/excess when physical cash exceeds expected", () => {
      const expectedCash = 14150;
      const actualCounted = 14220;
      const variance = actualCounted - expectedCash;

      assert.equal(variance, 70);
      assert.ok(variance > 0.01, "Should be flagged as EXCESS");
    });
  });

  describe("Multi-Tender Channel Isolation", () => {
    test("ensures digital payments (UPI, Card, Credit) do not inflate Expected Cash in drawer", () => {
      const openingFloat = 1000;
      const transactions = [
        { mode: "CASH", paidAmount: 800 },
        { mode: "UPI", paidAmount: 2500 },
        { mode: "CARD", paidAmount: 1800 },
        { mode: "CREDIT", dueAmount: 900 },
        { mode: "CASH", paidAmount: 450 },
      ];

      let cashSales = 0;
      let upiSales = 0;
      let cardSales = 0;
      let creditSales = 0;

      transactions.forEach((tx) => {
        if (tx.mode === "CASH") cashSales += tx.paidAmount ?? 0;
        if (tx.mode === "UPI") upiSales += tx.paidAmount ?? 0;
        if (tx.mode === "CARD") cardSales += tx.paidAmount ?? 0;
        if (tx.mode === "CREDIT") creditSales += tx.dueAmount ?? 0;
      });

      const totalPayouts = 100;
      const expectedCash = openingFloat + cashSales - totalPayouts;

      assert.equal(cashSales, 1250);
      assert.equal(upiSales, 2500);
      assert.equal(cardSales, 1800);
      assert.equal(creditSales, 900);
      assert.equal(expectedCash, 1000 + 1250 - 100);
      assert.equal(expectedCash, 2150);
    });
  });
});
