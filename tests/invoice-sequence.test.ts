import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getIndianFinancialYear } from "../src/lib/invoice-sequence";

describe("Indian Financial Year Calculation (getIndianFinancialYear)", () => {
  it("should compute FY 2025-26 for March 31, 2026 before midnight IST", () => {
    const d = new Date("2026-03-31T23:59:59+05:30");
    const fy = getIndianFinancialYear(d);
    assert.strictEqual(fy.full, "2025-26");
    assert.strictEqual(fy.compact, "2526");
    assert.strictEqual(fy.startYear, 2025);
    assert.strictEqual(fy.endYear, 2026);
  });

  it("should rollover to FY 2026-27 on April 1, 2026 at 00:00:00 IST", () => {
    const d = new Date("2026-04-01T00:00:00+05:30");
    const fy = getIndianFinancialYear(d);
    assert.strictEqual(fy.full, "2026-27");
    assert.strictEqual(fy.compact, "2627");
    assert.strictEqual(fy.startYear, 2026);
    assert.strictEqual(fy.endYear, 2027);
  });

  it("should compute FY 2026-27 for mid-year (September 2026)", () => {
    const d = new Date("2026-09-18T12:00:00+05:30");
    const fy = getIndianFinancialYear(d);
    assert.strictEqual(fy.full, "2026-27");
    assert.strictEqual(fy.compact, "2627");
  });

  it("should remain in FY 2026-27 for January 2027 (Q4 of financial year)", () => {
    const d = new Date("2027-01-15T15:30:00+05:30");
    const fy = getIndianFinancialYear(d);
    assert.strictEqual(fy.full, "2026-27");
    assert.strictEqual(fy.compact, "2627");
  });

  it("should correctly rollover to FY 2027-28 on April 1, 2027", () => {
    const d = new Date("2027-04-01T08:00:00+05:30");
    const fy = getIndianFinancialYear(d);
    assert.strictEqual(fy.full, "2027-28");
    assert.strictEqual(fy.compact, "2728");
  });
});
