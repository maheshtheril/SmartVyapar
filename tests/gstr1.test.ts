import test from "node:test";
import assert from "node:assert/strict";
import {
  generateOfficialGstr1Json,
  generateGstr3bSummary,
  formatGstDate,
  normalizeUqc,
} from "../src/lib/gstr1.js";

test("Statutory GSTR-1 Portal JSON & GSTR-3B Summary", async (t) => {
  await t.test("formatGstDate should format dates into statutory DD-MM-YYYY format", () => {
    const formatted = formatGstDate(new Date("2026-09-18T10:00:00Z"));
    assert.equal(formatted, "18-09-2026");
  });

  await t.test("normalizeUqc should map various unit strings to official GST UQC codes", () => {
    assert.equal(normalizeUqc("pcs"), "PCS");
    assert.equal(normalizeUqc("BOXES"), "BOX");
    assert.equal(normalizeUqc("meters"), "MTR");
    assert.equal(normalizeUqc("Kg"), "KGS");
    assert.equal(normalizeUqc("unknown_unit"), "OTH");
    assert.equal(normalizeUqc(null), "OTH");
  });

  await t.test("generateOfficialGstr1Json should correctly segregate B2B and B2C Small outward supplies", () => {
    const tenant = {
      gstin: "32AAAAA0000A1Z5",
      stateCode: "32",
      businessName: "Ziona Electricals",
    };

    const invoices = [
      // 1. B2B Invoice (Registered buyer with GSTIN)
      {
        id: "inv-1",
        invoiceNumber: "INV-2627-0001",
        invoiceDate: new Date("2026-09-05"),
        customerName: "Apex Retailers Ltd",
        customerGstin: "32BBBBB1111B1Z2",
        customerStateCode: "32",
        subtotal: 10000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        totalTax: 1800,
        totalAmount: 11800,
        items: [
          {
            productName: "Copper Cable 2.5mm",
            hsnCode: "8544",
            unitSold: "MTR",
            quantity: 100,
            unitPrice: 100,
            gstRate: 18,
            cgstAmount: 900,
            sgstAmount: 900,
            igstAmount: 0,
          },
        ],
      },
      // 2. B2C Small Invoice (Unregistered buyer in Kerala)
      {
        id: "inv-2",
        invoiceNumber: "INV-2627-0002",
        invoiceDate: new Date("2026-09-10"),
        customerName: "Walk-in Customer",
        customerGstin: null,
        customerStateCode: "32",
        subtotal: 2000,
        cgstAmount: 180,
        sgstAmount: 180,
        igstAmount: 0,
        totalTax: 360,
        totalAmount: 2360,
        items: [
          {
            productName: "LED Bulb 9W",
            hsnCode: "8539",
            unitSold: "PCS",
            quantity: 20,
            unitPrice: 100,
            gstRate: 18,
            cgstAmount: 180,
            sgstAmount: 180,
            igstAmount: 0,
          },
        ],
      },
      // 3. Second B2C Small Invoice with same rate (to verify aggregation)
      {
        id: "inv-3",
        invoiceNumber: "INV-2627-0003",
        invoiceDate: new Date("2026-09-12"),
        customerName: "Walk-in Customer 2",
        customerGstin: "URP",
        customerStateCode: "32",
        subtotal: 3000,
        cgstAmount: 270,
        sgstAmount: 270,
        igstAmount: 0,
        totalTax: 540,
        totalAmount: 3540,
        items: [
          {
            productName: "LED Tube 20W",
            hsnCode: "8539",
            unitSold: "PCS",
            quantity: 15,
            unitPrice: 200,
            gstRate: 18,
            cgstAmount: 270,
            sgstAmount: 270,
            igstAmount: 0,
          },
        ],
      },
    ];

    const payload = generateOfficialGstr1Json({
      tenant,
      invoices,
      creditNotes: [],
      returnPeriod: "092026",
    });

    // Verify top-level structure
    assert.equal(payload.gstin, "32AAAAA0000A1Z5");
    assert.equal(payload.fp, "092026");
    assert.equal(payload.gt, 17700);

    // Verify B2B segregation
    assert.equal(payload.b2b.length, 1);
    assert.equal(payload.b2b[0].ctin, "32BBBBB1111B1Z2");
    assert.equal(payload.b2b[0].inv.length, 1);
    assert.equal(payload.b2b[0].inv[0].inum, "INV-2627-0001");
    assert.equal(payload.b2b[0].inv[0].val, 11800);
    assert.equal(payload.b2b[0].inv[0].pos, "32");

    // Verify B2CS aggregation (inv-2 and inv-3 aggregated into one 18% slab entry)
    assert.equal(payload.b2cs.length, 1);
    assert.equal(payload.b2cs[0].pos, "32");
    assert.equal(payload.b2cs[0].rt, 18);
    assert.equal(payload.b2cs[0].txval, 5000); // 2000 + 3000
    assert.equal(payload.b2cs[0].camt, 450);  // 180 + 270
    assert.equal(payload.b2cs[0].samt, 450);  // 180 + 270
  });

  await t.test("generateOfficialGstr1Json should handle CDNR (Registered) and CDNUR (Unregistered) Credit Notes", () => {
    const tenant = {
      gstin: "32AAAAA0000A1Z5",
      stateCode: "32",
    };

    const creditNotes = [
      // Registered customer credit note
      {
        id: "cn-1",
        creditNoteNumber: "CN-2627-0001",
        creditNoteDate: new Date("2026-09-15"),
        originalInvoiceNumber: "INV-2627-0001",
        originalInvoiceDate: new Date("2026-09-05"),
        customerName: "Apex Retailers Ltd",
        customerGstin: "32BBBBB1111B1Z2",
        customerStateCode: "32",
        subtotal: 1000,
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        totalTax: 180,
        totalAmount: 1180,
        items: [
          {
            productName: "Copper Cable 2.5mm",
            hsnCode: "8544",
            quantity: 10,
            unitPrice: 100,
            gstRate: 18,
            cgstAmount: 90,
            sgstAmount: 90,
            igstAmount: 0,
          },
        ],
      },
      // Unregistered customer credit note
      {
        id: "cn-2",
        creditNoteNumber: "CN-2627-0002",
        creditNoteDate: new Date("2026-09-16"),
        originalInvoiceNumber: "INV-2627-0002",
        originalInvoiceDate: new Date("2026-09-10"),
        customerName: "Walk-in Customer",
        customerGstin: null,
        customerStateCode: "32",
        subtotal: 500,
        cgstAmount: 45,
        sgstAmount: 45,
        igstAmount: 0,
        totalTax: 90,
        totalAmount: 590,
        items: [
          {
            productName: "LED Bulb 9W",
            hsnCode: "8539",
            quantity: 5,
            unitPrice: 100,
            gstRate: 18,
            cgstAmount: 45,
            sgstAmount: 45,
            igstAmount: 0,
          },
        ],
      },
    ];

    const payload = generateOfficialGstr1Json({
      tenant,
      invoices: [],
      creditNotes,
      returnPeriod: "092026",
    });

    // CDNR
    assert.equal(payload.cdnr.length, 1);
    assert.equal(payload.cdnr[0].ctin, "32BBBBB1111B1Z2");
    assert.equal(payload.cdnr[0].nt[0].nt_num, "CN-2627-0001");
    assert.equal(payload.cdnr[0].nt[0].inum, "INV-2627-0001");
    assert.equal(payload.cdnr[0].nt[0].val, 1180);

    // CDNUR
    assert.equal(payload.cdnur.length, 1);
    assert.equal(payload.cdnur[0].nt_num, "CN-2627-0002");
    assert.equal(payload.cdnur[0].inum, "INV-2627-0002");
    assert.equal(payload.cdnur[0].val, 590);
  });

  await t.test("generateOfficialGstr1Json should generate Table 12 HSN Summary and Table 13 Document Series", () => {
    const tenant = { gstin: "32AAAAA0000A1Z5", stateCode: "32" };
    const invoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-2627-0001",
        invoiceDate: new Date("2026-09-01"),
        customerName: "C1",
        subtotal: 1000,
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        totalTax: 180,
        totalAmount: 1180,
        items: [
          {
            productName: "Switch 6A",
            hsnCode: "8536",
            unitSold: "PCS",
            quantity: 10,
            unitPrice: 100,
            gstRate: 18,
            cgstAmount: 90,
            sgstAmount: 90,
            igstAmount: 0,
          },
        ],
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-2627-0005",
        invoiceDate: new Date("2026-09-02"),
        customerName: "C2",
        subtotal: 2000,
        cgstAmount: 180,
        sgstAmount: 180,
        igstAmount: 0,
        totalTax: 360,
        totalAmount: 2360,
        items: [
          {
            productName: "Switch 16A",
            hsnCode: "8536",
            unitSold: "PCS",
            quantity: 10,
            unitPrice: 200,
            gstRate: 18,
            cgstAmount: 180,
            sgstAmount: 180,
            igstAmount: 0,
          },
        ],
      },
    ];

    const payload = generateOfficialGstr1Json({
      tenant,
      invoices,
      creditNotes: [],
      returnPeriod: "092026",
    });

    // HSN aggregation: both items share HSN 8536 and UQC PCS
    assert.equal(payload.hsn.data.length, 1);
    assert.equal(payload.hsn.data[0].hsn_sc, "8536");
    assert.equal(payload.hsn.data[0].uqc, "PCS");
    assert.equal(payload.hsn.data[0].qty, 20); // 10 + 10
    assert.equal(payload.hsn.data[0].txval, 3000); // 1000 + 2000
    assert.equal(payload.hsn.data[0].camt, 270);  // 90 + 180
    assert.equal(payload.hsn.data[0].samt, 270);

    // Table 13 Document Series
    assert.equal(payload.doc_issue.doc_det.length, 1);
    const invDocs = payload.doc_issue.doc_det[0].docs[0];
    assert.equal(invDocs.from, "INV-2627-0001");
    assert.equal(invDocs.to, "INV-2627-0005");
    assert.equal(invDocs.totnum, 2);
    assert.equal(invDocs.net_issue, 2);
  });

  await t.test("generateGstr3bSummary should offset Output Tax with Purchase Bill ITC and Sales Returns", () => {
    const invoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-1",
        invoiceDate: new Date(),
        customerName: "C1",
        subtotal: 10000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        totalTax: 1800,
        totalAmount: 11800,
        items: [],
      },
    ];

    const creditNotes = [
      {
        id: "cn-1",
        creditNoteNumber: "CN-1",
        creditNoteDate: new Date(),
        originalInvoiceNumber: "INV-1",
        originalInvoiceDate: new Date(),
        customerName: "C1",
        customerStateCode: "32",
        subtotal: 2000,
        cgstAmount: 180,
        sgstAmount: 180,
        igstAmount: 0,
        totalTax: 360,
        totalAmount: 2360,
        items: [],
      },
    ];

    const purchases = [
      {
        totalAmount: 5900,
        subtotal: 5000,
        cgstAmount: 450,
        sgstAmount: 450,
        igstAmount: 0,
      },
    ];

    const summary = generateGstr3bSummary({
      invoices,
      creditNotes,
      purchases,
    });

    // Net Outward Taxable: 10000 - 2000 = 8000
    assert.equal(summary.outwardSupplies.taxableValue, 8000);
    // Net Output CGST: 900 - 180 = 720
    assert.equal(summary.outwardSupplies.cgst, 720);
    assert.equal(summary.outwardSupplies.sgst, 720);
    assert.equal(summary.outwardSupplies.totalOutputTax, 1440);

    // Eligible ITC: 450 CGST + 450 SGST = 900
    assert.equal(summary.inputTaxCredit.cgst, 450);
    assert.equal(summary.inputTaxCredit.sgst, 450);
    assert.equal(summary.inputTaxCredit.totalItc, 900);

    // Net Payable: (720 - 450) = 270 CGST, 270 SGST = 540 Total
    assert.equal(summary.netPayable.cgst, 270);
    assert.equal(summary.netPayable.sgst, 270);
    assert.equal(summary.netPayable.totalPayable, 540);
    assert.equal(summary.netPayable.status, "TAX_PAYABLE");
  });
});
