import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Customer Loyalty & Rewards Points Engine", () => {
  describe("Point Accrual Calculation (1 Point per ₹100)", () => {
    test("should compute correct points earned from invoice total", () => {
      const invoiceTotal1 = 1250;
      const pointsEarned1 = Math.floor(invoiceTotal1 / 100);
      assert.equal(pointsEarned1, 12);

      const invoiceTotal2 = 99.5;
      const pointsEarned2 = Math.floor(invoiceTotal2 / 100);
      assert.equal(pointsEarned2, 0);

      const invoiceTotal3 = 5490;
      const pointsEarned3 = Math.floor(invoiceTotal3 / 100);
      assert.equal(pointsEarned3, 54);
    });
  });

  describe("Point Redemption & Bill Discounting Math", () => {
    test("1 reward point translates to ₹1.00 cash discount on net total", () => {
      const grossBillAmount = 1500;
      const customerPoints = 200;
      const requestedRedemption = 150;

      const pointsToRedeem = Math.min(
        requestedRedemption,
        customerPoints,
        Math.floor(grossBillAmount)
      );

      const loyaltyDiscountAmount = pointsToRedeem;
      const netPayable = grossBillAmount - loyaltyDiscountAmount;

      assert.equal(pointsToRedeem, 150);
      assert.equal(loyaltyDiscountAmount, 150);
      assert.equal(netPayable, 1350);
    });

    test("clamps redemption when requested points exceed customer point balance", () => {
      const grossBillAmount = 3000;
      const customerPoints = 80;
      const requestedRedemption = 200; // Customer only has 80

      const pointsToRedeem = Math.min(
        requestedRedemption,
        customerPoints,
        Math.floor(grossBillAmount)
      );

      assert.equal(pointsToRedeem, 80);
    });

    test("clamps redemption when points value exceeds the bill total", () => {
      const grossBillAmount = 45; // Small bill ₹45
      const customerPoints = 500; // Customer has 500 points
      const requestedRedemption = 500;

      const pointsToRedeem = Math.min(
        requestedRedemption,
        customerPoints,
        Math.floor(grossBillAmount)
      );

      // Max redeemable is 45 points (bill cannot go negative)
      assert.equal(pointsToRedeem, 45);
      const netPayable = grossBillAmount - pointsToRedeem;
      assert.equal(netPayable, 0);
    });
  });

  describe("Customer Closing Point Balance Tracking", () => {
    test("computes exact closing balance after redemption and accrual on same bill", () => {
      const startingPoints = 250;
      const grossBillAmount = 2000;
      const pointsRedeemed = 100; // -100 points (-₹100 discount)

      const netBillAmount = grossBillAmount - pointsRedeemed; // ₹1900
      const newPointsEarned = Math.floor(netBillAmount / 100); // +19 points

      const closingBalance = startingPoints - pointsRedeemed + newPointsEarned;

      // 250 - 100 + 19 = 169
      assert.equal(netBillAmount, 1900);
      assert.equal(newPointsEarned, 19);
      assert.equal(closingBalance, 169);
    });
  });
});
