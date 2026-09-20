/**
 * @file tests/gstr2b-matcher.test.ts
 * Unit tests for the GSTR-2B ITC Auto-Reconciliation Engine (Rule 36(4))
 * Uses Node.js built-in test runner: `tsx --test tests/*.test.ts`
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInvoiceNumber,
  parseGstr2bJson,
  reconcileGstr2bWithBooks,
  generateSupplierWhatsAppNotice,
  getSampleGstr2bJson,
  formatPeriodName,
  type NormalizedGstr2bRecord,
  type BooksPurchaseRecord,
  type ReconciliationReport,
} from "../src/lib/gstr2b-matcher";

// ---------------------------------------------------------------------------
// 1. normalizeInvoiceNumber
// ---------------------------------------------------------------------------
describe("normalizeInvoiceNumber", () => {
  test("uppercases and strips non-alphanumeric separators", () => {
    // INV-001 → strip hyphen → "INV001"
    assert.equal(normalizeInvoiceNumber("inv-001"), "INV001");
  });

  test("strips leading zeros from purely numeric strings", () => {
    assert.equal(normalizeInvoiceNumber("000456"), "456");
  });

  test("trims whitespace before normalising", () => {
    assert.equal(normalizeInvoiceNumber("  ABC123  "), "ABC123");
  });

  test("handles empty string without throwing", () => {
    assert.equal(normalizeInvoiceNumber(""), "");
  });

  test("handles already-clean alphanumeric input unchanged", () => {
    assert.equal(normalizeInvoiceNumber("GST2024987"), "GST2024987");
  });

  test("strips slashes and hyphens from SB/0001/24", () => {
    // SB/0001/24 → "SB000124" (all non-alphanum stripped)
    assert.equal(normalizeInvoiceNumber("SB/0001/24"), "SB000124");
  });
});

// ---------------------------------------------------------------------------
// 2. formatPeriodName
// ---------------------------------------------------------------------------
describe("formatPeriodName", () => {
  test("converts 082024 to August 2024", () => {
    assert.match(formatPeriodName("082024"), /August.*2024/i);
  });

  test("converts 012025 to January 2025", () => {
    assert.match(formatPeriodName("012025"), /January.*2025/i);
  });

  test("converts 122023 to December 2023", () => {
    assert.match(formatPeriodName("122023"), /December.*2023/i);
  });

  test("returns non-empty fallback for short invalid input", () => {
    const result = formatPeriodName("inv");
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });
});

// ---------------------------------------------------------------------------
// 3. parseGstr2bJson
// ---------------------------------------------------------------------------
describe("parseGstr2bJson", () => {
  test("parses the sample GSTR-2B portal object successfully", () => {
    const samplePortalObj = getSampleGstr2bJson();
    const result = parseGstr2bJson(samplePortalObj);

    assert.ok("buyerGstin" in result);
    assert.ok("returnPeriod" in result);
    assert.ok("records" in result);
    assert.ok(Array.isArray(result.records));
    assert.ok(result.records.length > 0);
  });

  test("each parsed record has required NormalizedGstr2bRecord fields", () => {
    const { records } = parseGstr2bJson(getSampleGstr2bJson());
    for (const rec of records) {
      assert.ok("supplierGstin" in rec, "missing supplierGstin");
      assert.ok("supplierName" in rec, "missing supplierName");
      assert.ok("invoiceNumber" in rec, "missing invoiceNumber");
      assert.ok("normalizedInvoiceNum" in rec, "missing normalizedInvoiceNum");
      assert.ok("invoiceDate" in rec, "missing invoiceDate");
      assert.ok("taxableValue" in rec, "missing taxableValue");
      assert.ok("cgst" in rec, "missing cgst");
      assert.ok("sgst" in rec, "missing sgst");
      assert.ok("igst" in rec, "missing igst");
      assert.ok("totalTax" in rec, "missing totalTax");
      assert.ok("itcAvailable" in rec, "missing itcAvailable");
    }
  });

  test("returns correct buyerGstin and returnPeriod from sample data", () => {
    const { buyerGstin, returnPeriod } = parseGstr2bJson(
      getSampleGstr2bJson("32AAAAA0000A1Z5", "082026")
    );
    assert.equal(buyerGstin, "32AAAAA0000A1Z5");
    assert.equal(returnPeriod, "082026");
  });

  test("returns empty records array when b2b list is empty", () => {
    const { records } = parseGstr2bJson({ gstin: "29DUMMY000A1Z5", fp: "082026", data: { b2b: [] } });
    assert.deepEqual(records, []);
  });

  test("handles missing data property gracefully", () => {
    const { records } = parseGstr2bJson({ gstin: "29DUMMY000A1Z5", fp: "082026" });
    assert.deepEqual(records, []);
  });
});

// ---------------------------------------------------------------------------
// 4. reconcileGstr2bWithBooks
// ---------------------------------------------------------------------------
describe("reconcileGstr2bWithBooks", () => {
  const g2bRecords: NormalizedGstr2bRecord[] = [
    {
      supplierGstin: "29AAACR5055K1ZK",
      supplierName: "Reliance Retail Ltd",
      invoiceNumber: "RRL001",
      normalizedInvoiceNum: normalizeInvoiceNumber("RRL001"),
      invoiceDate: "15-08-2024",
      taxableValue: 10000,
      cgst: 900,
      sgst: 900,
      igst: 0,
      totalTax: 1800,
      totalAmount: 11800,
      itcAvailable: true,
      supplierFiled: true,
    },
    {
      supplierGstin: "27AABCU9603R1ZM",
      supplierName: "Unilever India",
      invoiceNumber: "UNI500",
      normalizedInvoiceNum: normalizeInvoiceNumber("UNI500"),
      invoiceDate: "20-08-2024",
      taxableValue: 5000,
      cgst: 0,
      sgst: 0,
      igst: 900,
      totalTax: 900,
      totalAmount: 5900,
      itcAvailable: true,
      supplierFiled: true,
    },
    {
      supplierGstin: "07AAACH8497F1Z3",
      supplierName: "HUL Delhi",
      invoiceNumber: "HUL999",
      normalizedInvoiceNum: normalizeInvoiceNumber("HUL999"),
      invoiceDate: "25-08-2024",
      taxableValue: 8000,
      cgst: 0,
      sgst: 0,
      igst: 1440,
      totalTax: 1440,
      totalAmount: 9440,
      itcAvailable: true,
      supplierFiled: true,
    },
  ];

  const booksRecords: BooksPurchaseRecord[] = [
    {
      id: "bill-001",
      billNumber: "RRL001",
      normalizedBillNum: normalizeInvoiceNumber("RRL001"),
      billDate: "2024-08-15",
      supplierName: "Reliance Retail Ltd",
      supplierGstin: "29AAACR5055K1ZK",
      supplierPhone: "9876543210",
      taxableValue: 10000,
      cgst: 900,
      sgst: 900,
      igst: 0,
      totalTax: 1800,
      totalAmount: 11800,
    },
    {
      id: "bill-002",
      billNumber: "UNI500",
      normalizedBillNum: normalizeInvoiceNumber("UNI500"),
      billDate: "2024-08-20",
      supplierName: "Unilever India",
      supplierGstin: "27AABCU9603R1ZM",
      supplierPhone: null,
      taxableValue: 5000,
      cgst: 0,
      sgst: 0,
      igst: 1200,   // mismatch: 2B says 900
      totalTax: 1200,
      totalAmount: 6200,
    },
    // HUL999 → in 2B but NOT in books → MISSING_IN_BOOKS
    {
      id: "bill-003",
      billNumber: "LOCAL777",   // in books but NOT in 2B → MISSING_IN_2B
      normalizedBillNum: normalizeInvoiceNumber("LOCAL777"),
      billDate: "2024-08-28",
      supplierName: "Local Supplier",
      supplierGstin: "29DUMMY0000G1ZZ",
      supplierPhone: null,
      taxableValue: 3000,
      cgst: 270,
      sgst: 270,
      igst: 0,
      totalTax: 540,
      totalAmount: 3540,
    },
  ];

  let report: ReconciliationReport;

  before(() => {
    report = reconcileGstr2bWithBooks(
      "ZIONA ELECTRICALS",
      "29AAAAA0000A1Z5",
      "082024",
      g2bRecords,
      booksRecords
    );
  });

  test("returns a report object with rows and summary", () => {
    assert.ok("rows" in report);
    assert.ok("summary" in report);
    assert.ok(Array.isArray(report.rows));
  });

  test("summary has all required fields", () => {
    const { summary } = report;
    const fields = [
      "matchedCount", "mismatchedCount", "missingIn2bCount", "missingInBooksCount",
      "matchedItc", "pendingItc", "ineligibleItc",
    ];
    for (const f of fields) {
      assert.ok(f in summary, `summary missing field: ${f}`);
    }
  });

  test("identifies the exactly matched invoice (RRL001 → MATCHED)", () => {
    const matched = report.rows.filter((r) => r.status === "MATCHED");
    assert.equal(matched.length, 1);
    assert.equal(normalizeInvoiceNumber(matched[0].invoiceNumber), "RRL001");
  });

  test("identifies the value-mismatch invoice (UNI500 → VALUE_MISMATCH)", () => {
    const mismatched = report.rows.filter((r) => r.status === "VALUE_MISMATCH");
    assert.equal(mismatched.length, 1);
    assert.equal(normalizeInvoiceNumber(mismatched[0].invoiceNumber), "UNI500");
  });

  test("identifies invoice in 2B but missing in books (HUL999 → MISSING_IN_BOOKS)", () => {
    const rows = report.rows.filter((r) => r.status === "MISSING_IN_BOOKS");
    assert.equal(rows.length, 1);
    assert.equal(normalizeInvoiceNumber(rows[0].invoiceNumber), "HUL999");
  });

  test("identifies invoice in books but missing in 2B (LOCAL777 → MISSING_IN_2B)", () => {
    const rows = report.rows.filter((r) => r.status === "MISSING_IN_2B");
    assert.equal(rows.length, 1);
    assert.equal(normalizeInvoiceNumber(rows[0].invoiceNumber), "LOCAL777");
  });

  test("summary counts sum equals total rows", () => {
    const { summary, rows } = report;
    const total =
      summary.matchedCount + summary.mismatchedCount +
      summary.missingIn2bCount + summary.missingInBooksCount;
    assert.equal(total, rows.length);
  });

  test("MISSING_IN_2B rows have a whatsappUrl attached", () => {
    const rows = report.rows.filter((r) => r.status === "MISSING_IN_2B");
    assert.ok(rows.length > 0);
    assert.ok(typeof rows[0].whatsappUrl === "string");
    assert.ok((rows[0].whatsappUrl as string).startsWith("https://wa.me"));
  });
});

// ---------------------------------------------------------------------------
// 5. generateSupplierWhatsAppNotice
// ---------------------------------------------------------------------------
describe("generateSupplierWhatsAppNotice", () => {
  const result = generateSupplierWhatsAppNotice(
    "ZIONA ELECTRICALS",
    "Reliance Retail Ltd",
    "9876543210",
    "RRL001",
    "2024-08-15",
    11800,
    1800,
    "082024"
  );

  test("returns object with url and message", () => {
    assert.ok("url" in result);
    assert.ok("message" in result);
  });

  test("message is a non-empty string longer than 50 chars", () => {
    assert.equal(typeof result.message, "string");
    assert.ok(result.message.length > 50);
  });

  test("message contains the bill number", () => {
    assert.ok(result.message.includes("RRL001"));
  });

  test("message contains the buyer business name", () => {
    assert.ok(result.message.includes("ZIONA ELECTRICALS"));
  });

  test("message mentions Rule 36(4)", () => {
    assert.ok(result.message.includes("36(4)"));
  });

  test("url is a WhatsApp deep link with phone", () => {
    assert.ok(result.url.includes("wa.me/919876543210"));
  });

  test("url without phone still produces wa.me link", () => {
    const noPhone = generateSupplierWhatsAppNotice(
      "TEST SHOP", "Vendor X", null,
      "V001", "2024-08-01", 5000, 900, "082024"
    );
    assert.ok(noPhone.url.includes("wa.me/?text="));
  });
});
