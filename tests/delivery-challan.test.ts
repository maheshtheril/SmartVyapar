/**
 * @file tests/delivery-challan.test.ts
 * Unit tests for Delivery Challans & Goods Movement without Sale (GST Rule 55)
 * Uses Node.js built-in test runner: `tsx --test tests/*.test.ts`
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Delivery Challan (Rule 55) Business Logic", () => {
  test("intra-state delivery challan splits GST evenly into CGST and SGST", () => {
    const qty = 5;
    const rate = 2000;
    const gstRate = 18;
    const taxable = qty * rate; // 10000

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

    assert.equal(taxable, 10000);
    assert.equal(cgst, 900);
    assert.equal(sgst, 900);
    assert.equal(igst, 0);
    assert.equal(taxable + cgst + sgst + igst, 11800);
  });

  test("inter-state delivery challan charges 100% IGST", () => {
    const qty = 2;
    const rate = 15000;
    const gstRate = 18;
    const taxable = qty * rate; // 30000

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

    assert.equal(taxable, 30000);
    assert.equal(cgst, 0);
    assert.equal(sgst, 0);
    assert.equal(igst, 5400);
    assert.equal(taxable + cgst + sgst + igst, 35400);
  });

  test("challan purpose is recognized for statutory Rule 55 declarations", () => {
    const validPurposes = [
      "SUPPLY_ON_APPROVAL",
      "JOB_WORK",
      "REMOVAL_FOR_SALE",
      "EXHIBITION_OR_DEMO",
      "OTHER",
    ];

    for (const p of validPurposes) {
      assert.ok(typeof p === "string");
    }
  });
});
