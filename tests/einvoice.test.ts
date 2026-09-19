import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getFinancialYear,
  formatEinvoiceDate,
  computeIrn,
  generateAckNumber,
  generateSignedQrPayload,
  generateNicEinvoicePayload,
  validateCancelEligibility,
} from "../src/lib/einvoice";
import { CancelEinvoiceSchema } from "../src/lib/schemas/einvoice";

describe("E-Invoice Statutory Engine (GST Rule 48(4))", () => {
  describe("Indian Financial Year Calculation", () => {
    it("should correctly identify FY for mid-year dates (September)", () => {
      const fy = getFinancialYear(new Date("2026-09-19T00:00:00Z"));
      assert.strictEqual(fy, "2026-27");
    });

    it("should correctly identify FY for Q4 dates (February)", () => {
      const fy = getFinancialYear(new Date("2027-02-15T00:00:00Z"));
      assert.strictEqual(fy, "2026-27");
    });

    it("should correctly identify FY for boundary dates (April 1)", () => {
      const fy = getFinancialYear(new Date("2026-04-01T00:00:00Z"));
      assert.strictEqual(fy, "2026-27");
    });

    it("should correctly identify FY for boundary dates (March 31)", () => {
      const fy = getFinancialYear(new Date("2026-03-31T12:00:00Z"));
      assert.strictEqual(fy, "2025-26");
    });
  });

  describe("Date Formatting for NIC IRP", () => {
    it("should format date into DD/MM/YYYY string", () => {
      const formatted = formatEinvoiceDate(new Date("2026-09-19T10:30:00Z"));
      assert.strictEqual(formatted, "19/09/2026");
    });
  });

  describe("IRN Computation (SHA-256 Hash)", () => {
    it("should generate a 64-character lowercase hexadecimal hash", () => {
      const irn = computeIrn(
        "32AAAAA0000A1Z5",
        "INV-2026-0001",
        "INV",
        new Date("2026-09-19")
      );
      assert.strictEqual(irn.length, 64);
      assert.strictEqual(/^[0-9a-f]{64}$/.test(irn), true);
    });

    it("should be deterministic for the same parameters", () => {
      const irn1 = computeIrn(
        "32AAAAA0000A1Z5",
        "INV-2026-0001",
        "INV",
        new Date("2026-09-19")
      );
      const irn2 = computeIrn(
        "32AAAAA0000A1Z5",
        "INV-2026-0001",
        "INV",
        new Date("2026-09-19")
      );
      assert.strictEqual(irn1, irn2);
    });

    it("should produce distinct hashes for different invoice numbers", () => {
      const irn1 = computeIrn("32AAAAA0000A1Z5", "INV-2026-0001", "INV", new Date("2026-09-19"));
      const irn2 = computeIrn("32AAAAA0000A1Z5", "INV-2026-0002", "INV", new Date("2026-09-19"));
      assert.notStrictEqual(irn1, irn2);
    });
  });

  describe("IRP Acknowledgment Number Generation", () => {
    it("should generate a 16-digit acknowledgment number starting with 11", () => {
      const ackNo = generateAckNumber();
      assert.strictEqual(ackNo.length, 16);
      assert.strictEqual(ackNo.startsWith("11"), true);
      assert.strictEqual(/^\d{16}$/.test(ackNo), true);
    });
  });

  describe("Signed QR Code Generation", () => {
    it("should generate a 3-segment JWT containing statutory e-invoice fields", () => {
      const irn = computeIrn("32AAAAA0000A1Z5", "INV-2026-0001", "INV", new Date("2026-09-19"));
      const ackNo = "1126123456789012";
      const ackDate = "2026-09-19T10:00:00.000Z";

      const qrPayload = generateSignedQrPayload({
        sellerGstin: "32AAAAA0000A1Z5",
        buyerGstin: "32BBBBB1111B1Z2",
        docNo: "INV-2026-0001",
        docDate: "19/09/2026",
        totInvVal: 1180.0,
        itemCount: 1,
        mainHsn: "8504",
        irn,
        ackNo,
        ackDate,
      });

      const parts = qrPayload.split(".");
      assert.strictEqual(parts.length, 3);

      // Verify Header
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
      assert.strictEqual(header.alg, "RS256");
      assert.strictEqual(header.typ, "JWT");

      // Verify Payload
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      assert.strictEqual(payload.data.SellerGstin, "32AAAAA0000A1Z5");
      assert.strictEqual(payload.data.BuyerGstin, "32BBBBB1111B1Z2");
      assert.strictEqual(payload.data.DocNo, "INV-2026-0001");
      assert.strictEqual(payload.data.TotInvVal, 1180.0);
      assert.strictEqual(payload.data.Irn, irn);
      assert.strictEqual(payload.data.AckNo, ackNo);
      assert.strictEqual(payload.iss, "NIC-IRP-PORTAL");
    });
  });

  describe("NIC GST INV-01 Payload Structure", () => {
    it("should generate schema-compliant JSON with mandatory sections", () => {
      const mockTenant: any = {
        id: "t1",
        businessName: "Ziona Electricals",
        legalName: "Ziona Electricals Private Limited",
        gstin: "32AAAAA0000A1Z5",
        stateCode: "32",
        stateName: "Kerala",
        address: "Marine Drive, Kochi",
        pincode: "682001",
        phone: "9876543210",
        email: "contact@ziona.in",
      };

      const mockInvoice: any = {
        id: "inv1",
        invoiceNumber: "INV-2026-0001",
        invoiceDate: new Date("2026-09-19T09:00:00Z"),
        customerGstin: "32BBBBB1111B1Z2",
        customerName: "Apex Retailers",
        customerPhone: "9845012345",
        customerStateCode: "32",
        isInterState: false,
        subtotal: 1000,
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        totalTax: 180,
        totalAmount: 1180,
        customer: {
          address: "MG Road, Ernakulam",
          pincode: "682016",
        },
        items: [
          {
            productName: "Copper Armored Cable",
            hsnCode: "8544",
            quantity: 10,
            unitSold: "MTR",
            unitPrice: 100,
            gstRate: 18,
          },
        ],
      };

      const payload = generateNicEinvoicePayload(mockInvoice, mockTenant);

      assert.strictEqual(payload.Version, "1.1");
      assert.strictEqual(payload.TranDtls.TaxSch, "GST");
      assert.strictEqual(payload.TranDtls.SupTyp, "B2B");
      assert.strictEqual(payload.DocDtls.Typ, "INV");
      assert.strictEqual(payload.DocDtls.No, "INV-2026-0001");
      assert.strictEqual(payload.DocDtls.Dt, "19/09/2026");

      assert.strictEqual(payload.SellerDtls.Gstin, "32AAAAA0000A1Z5");
      assert.strictEqual(payload.BuyerDtls.Gstin, "32BBBBB1111B1Z2");

      assert.strictEqual(payload.ItemList.length, 1);
      assert.strictEqual(payload.ItemList[0].HsnCd, "8544");
      assert.strictEqual(payload.ItemList[0].TotAmt, 1000);
      assert.strictEqual(payload.ItemList[0].CgstAmt, 90);
      assert.strictEqual(payload.ItemList[0].SgstAmt, 90);
      assert.strictEqual(payload.ItemList[0].TotItemVal, 1180);

      assert.strictEqual(payload.ValDtls.AssVal, 1000);
      assert.strictEqual(payload.ValDtls.CgstVal, 90);
      assert.strictEqual(payload.ValDtls.SgstVal, 90);
      assert.strictEqual(payload.ValDtls.TotInvVal, 1180);
    });
  });

  describe("Cancellation Window Eligibility (GST Rule 48(4) 24h Limit)", () => {
    it("should allow cancellation if ackDate is under 24 hours ago", () => {
      const recentAck = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = validateCancelEligibility(recentAck);
      assert.strictEqual(result.eligible, true);
      assert.strictEqual(result.hoursElapsed >= 1.9 && result.hoursElapsed <= 2.1, true);
    });

    it("should reject cancellation if ackDate exceeds 24 hours with statutory notice", () => {
      const expiredAck = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26 hours ago
      const result = validateCancelEligibility(expiredAck);
      assert.strictEqual(result.eligible, false);
      assert.strictEqual(result.hoursElapsed >= 25.9, true);
      assert.strictEqual(result.message?.includes("Statutory 24-hour IRP cancellation window has expired"), true);
      assert.strictEqual(result.message?.includes("Credit Note"), true);
    });
  });

  describe("CancelEinvoiceSchema Validation", () => {
    it("should accept valid GST cancellation reasons", () => {
      const valid = CancelEinvoiceSchema.safeParse({
        cancelReason: "2",
        cancelRemarks: "Wrong quantity entered by billing staff",
      });
      assert.strictEqual(valid.success, true);
    });

    it("should reject invalid cancellation reason codes", () => {
      const invalid = CancelEinvoiceSchema.safeParse({
        cancelReason: "9",
      });
      assert.strictEqual(invalid.success, false);
    });
  });
});
