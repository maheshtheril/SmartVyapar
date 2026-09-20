import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateOfflineBillId,
  validateOfflineBill,
  OfflineBill,
} from "../src/lib/offline-pos";

describe("Offline-First POS & IndexedDB Engine", () => {
  test("generateOfflineBillId should generate statutory prefix OFF-YYYYMMDD-XXXX", () => {
    const id = generateOfflineBillId();
    assert.match(id, /^OFF-\d{8}-\d{4}$/, "ID must match statutory offline format");
  });

  test("validateOfflineBill should reject bill with zero items", () => {
    const check = validateOfflineBill({ items: [], totalAmount: 100 });
    assert.equal(check.valid, false);
    assert.ok(check.error?.includes("at least one item"));
  });

  test("validateOfflineBill should reject bill with zero or negative amount", () => {
    const check = validateOfflineBill({
      items: [
        {
          productId: "p1",
          name: "Spark Plug",
          quantity: 1,
          unitPrice: 0,
          gstRate: 18,
          total: 0,
        },
      ],
      totalAmount: 0,
    });
    assert.equal(check.valid, false);
    assert.ok(check.error?.includes("greater than zero"));
  });

  test("validateOfflineBill should accept well-formed offline POS bill", () => {
    const check = validateOfflineBill({
      items: [
        {
          productId: "p1",
          name: "Castrol Engine Oil 1L",
          quantity: 2,
          unitPrice: 450,
          gstRate: 18,
          total: 1062,
        },
      ],
      totalAmount: 1062,
    });
    assert.equal(check.valid, true);
    assert.equal(check.error, undefined);
  });
});
