import test from "node:test";
import assert from "node:assert/strict";
import {
  indianVehicleNoSchema,
  EWayBillTransportSchema,
} from "../src/lib/schemas/eway-bill.js";
import {
  generateNicEwayBillPayload,
  formatNicDate,
} from "../src/lib/eway-bill.js";

test("GST E-Way Bill System (GST Rule 138 / NIC Schema)", async (t) => {
  await t.test("Indian Vehicle Registration Number Sanitization & Validation", async (t) => {
    await t.test("should clean and accept valid standard state format (e.g. KL07AB1234)", () => {
      const validNumbers = [
        "KL07AB1234",
        "kl 07 ab 1234",
        "MH-12-CD-5678",
        "DL1A1234",
        "KA011234",
      ];

      for (const num of validNumbers) {
        const result = indianVehicleNoSchema.safeParse(num);
        assert.equal(result.success, true, `Expected ${num} to be valid`);
      }
    });

    await t.test("should accept valid Bharat Series format (e.g. 22BH1234AA)", () => {
      const result = indianVehicleNoSchema.safeParse("22BH1234AA");
      assert.equal(result.success, true);
    });

    await t.test("should reject malformed or non-Indian vehicle numbers", () => {
      const invalidNumbers = [
        "NOT_A_VEHICLE",
        "12345",
        "USA1234",
        "K1234",
      ];

      for (const num of invalidNumbers) {
        const result = indianVehicleNoSchema.safeParse(num);
        assert.equal(result.success, false, `Expected ${num} to be invalid`);
      }
    });
  });

  await t.test("Transport Details Validation (EWayBillTransportSchema)", async (t) => {
    await t.test("should require vehicle number when transport mode is Road ('1')", () => {
      const invalid = {
        transDistance: 45,
        transMode: "1", // Road
        vehicleNo: "", // Missing
        vehicleType: "R",
      };

      const result = EWayBillTransportSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) =>
            i.message.includes("Vehicle number is required for Road transport")
          )
        );
      }
    });

    await t.test("should reject distance exceeding statutory limit of 4000 KM", () => {
      const invalid = {
        transDistance: 5000,
        transMode: "1",
        vehicleNo: "KL07AB1234",
        vehicleType: "R",
      };

      const result = EWayBillTransportSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });

    await t.test("should accept a complete valid Road transport payload", () => {
      const valid = {
        transDistance: 75,
        transMode: "1",
        vehicleNo: "KL07AB1234",
        vehicleType: "R",
        transporterId: "32AAAAA0000A1Z5",
        transporterName: "Kerala Roadlines",
        transDocNo: "LR-10294",
        transDocDate: "2026-09-18",
        ewayBillNo: "121098765432",
      };

      const result = EWayBillTransportSchema.safeParse(valid);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.transDistance, 75);
        assert.equal(result.data.vehicleNo, "KL07AB1234");
      }
    });
  });

  await t.test("NIC Bulk E-Way Bill JSON Generation", () => {
    const mockTenant: any = {
      id: "tenant-1",
      businessName: "Ziona Tech & Electricals",
      gstin: "32AAAAA0000A1Z5",
      stateCode: "32",
      stateName: "Kerala",
      address: "MG Road, Kochi",
      pincode: "682001",
    };

    const mockInvoice: any = {
      id: "inv-1",
      invoiceNumber: "INV-2627-0001",
      invoiceDate: new Date("2026-09-18T10:00:00Z"),
      customerName: "Apex Retailers Ltd",
      customerGstin: "32BBBBB0000B1Z6",
      customerStateCode: "32",
      isInterState: false,
      subtotal: 50000.0,
      cgstAmount: 4500.0,
      sgstAmount: 4500.0,
      igstAmount: 0.0,
      totalAmount: 59000.0,
      items: [
        {
          id: "item-1",
          productName: "Industrial Switchgear 63A",
          hsnCode: "8536",
          quantity: 10,
          unitSold: "PCS",
          unitPrice: 5000.0,
          gstRate: 18.0,
        },
      ],
      customer: {
        address: "Industrial Area, Kalamassery",
        pincode: "683104",
      },
    };

    const transport: any = {
      transDistance: 35,
      transMode: "1",
      vehicleNo: "KL07AB1234",
      vehicleType: "R",
      transporterId: "32TRANS0000A1Z5",
      transporterName: "Speed Express",
      transDocNo: "LR-5544",
      transDocDate: "2026-09-18",
    };

    const payload = generateNicEwayBillPayload(mockInvoice, mockTenant, transport);

    // Verify official NIC Version
    assert.equal(payload.version, "1.0.0621");
    assert.equal(payload.billLists.length, 1);

    const bill = payload.billLists[0];
    assert.equal(bill.userGstin, "32AAAAA0000A1Z5");
    assert.equal(bill.docNo, "INV-2627-0001");
    assert.equal(bill.docDate, formatNicDate(mockInvoice.invoiceDate));
    assert.equal(bill.totInvValue, 59000.0);
    assert.equal(bill.transDistance, "35");
    assert.equal(bill.vehicleNo, "KL07AB1234");
    assert.equal(bill.transMode, "1");

    // Line item verification
    assert.equal(bill.itemList.length, 1);
    assert.equal(bill.itemList[0].hsnCode, 8536);
    assert.equal(bill.itemList[0].taxableAmount, 50000.0);
    assert.equal(bill.itemList[0].cgstRate, 9.0);
    assert.equal(bill.itemList[0].sgstRate, 9.0);
    assert.equal(bill.itemList[0].igstRate, 0.0);
  });
});
