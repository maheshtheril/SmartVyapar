import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CreateVoucherSchema } from "../src/lib/schemas/voucher";
import {
  getVoucherPrefix,
  computeAccountBalanceDelta,
} from "../src/lib/accounting-voucher";

describe("Double-Entry Accounting Vouchers Engine", () => {
  describe("Voucher Prefix Mapping", () => {
    test("should map voucher types to standard statutory prefixes", () => {
      assert.equal(getVoucherPrefix("PAYMENT"), "PV");
      assert.equal(getVoucherPrefix("RECEIPT"), "RV");
      assert.equal(getVoucherPrefix("CONTRA"), "CV");
      assert.equal(getVoucherPrefix("JOURNAL"), "JV");
    });
  });

  describe("Balance Delta Computation (Double-Entry Rules)", () => {
    test("ASSET accounts: Debit increases balance, Credit decreases balance", () => {
      // Debit cash by 5000 -> +5000
      const deltaDebit = computeAccountBalanceDelta("ASSET", 5000, 0);
      assert.equal(deltaDebit, 5000);

      // Credit cash by 2000 -> -2000
      const deltaCredit = computeAccountBalanceDelta("ASSET", 0, 2000);
      assert.equal(deltaCredit, -2000);
    });

    test("EXPENSE accounts: Debit increases expense balance, Credit decreases", () => {
      const delta = computeAccountBalanceDelta("EXPENSE", 1500, 0);
      assert.equal(delta, 1500);
    });

    test("LIABILITY accounts: Credit increases liability, Debit decreases", () => {
      // Taking loan: Credit 50000 -> +50000
      const deltaCredit = computeAccountBalanceDelta("LIABILITY", 0, 50000);
      assert.equal(deltaCredit, 50000);

      // Repaying loan: Debit 10000 -> -10000
      const deltaDebit = computeAccountBalanceDelta("LIABILITY", 10000, 0);
      assert.equal(deltaDebit, -10000);
    });

    test("REVENUE accounts: Credit increases revenue, Debit decreases", () => {
      const delta = computeAccountBalanceDelta("REVENUE", 0, 25000);
      assert.equal(delta, 25000);
    });

    test("EQUITY accounts: Credit increases equity, Debit decreases", () => {
      const delta = computeAccountBalanceDelta("EQUITY", 0, 100000);
      assert.equal(delta, 100000);
    });
  });

  describe("CreateVoucherSchema Validation", () => {
    test("should reject unbalanced vouchers where Debit !== Credit", () => {
      const unbalanced = {
        voucherType: "PAYMENT",
        narration: "Electricity bill payment",
        lines: [
          { accountId: "acc-1", debit: 5000, credit: 0 },
          { accountId: "acc-2", debit: 0, credit: 4500 }, // Off by 500
        ],
      };

      const result = CreateVoucherSchema.safeParse(unbalanced);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /unbalanced/i);
      }
    });

    test("should reject lines with both Debit and Credit amounts", () => {
      const invalid = {
        voucherType: "JOURNAL",
        narration: "Month end adjustment",
        lines: [
          { accountId: "acc-1", debit: 1000, credit: 1000 }, // Invalid
          { accountId: "acc-2", debit: 0, credit: 1000 },
        ],
      };

      const result = CreateVoucherSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /both Debit and Credit/i);
      }
    });

    test("should reject vouchers with fewer than 2 line items", () => {
      const singleLine = {
        voucherType: "PAYMENT",
        narration: "Rent payment",
        lines: [{ accountId: "acc-1", debit: 10000, credit: 0 }],
      };

      const result = CreateVoucherSchema.safeParse(singleLine);
      assert.equal(result.success, false);
    });

    test("should accept valid balanced multi-line double-entry voucher", () => {
      const balanced = {
        voucherType: "PAYMENT",
        referenceNo: "CHQ-882190",
        narration: "Office rent and electricity payment from HDFC Bank",
        lines: [
          { accountId: "acc-rent", debit: 15000, credit: 0, narration: "Shop Rent" },
          { accountId: "acc-elec", debit: 3500, credit: 0, narration: "Power Bill" },
          { accountId: "acc-bank", debit: 0, credit: 18500, narration: "HDFC Current A/c" },
        ],
      };

      const result = CreateVoucherSchema.safeParse(balanced);
      assert.equal(result.success, true);
    });
  });
});
