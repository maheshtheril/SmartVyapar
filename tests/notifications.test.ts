import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeIndianPhone,
  buildInvoiceMessage,
  buildKhataReminderMessage,
  sendWhatsAppMessage,
  sendSmsMessage,
} from "../src/lib/notifications";

describe("SMS & WhatsApp Cloud API Gateway", () => {
  describe("Indian Phone Number Normalization", () => {
    it("should normalize plain 10-digit mobile number", () => {
      const res = normalizeIndianPhone("9876543210");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.tenDigit, "9876543210");
      assert.strictEqual(res.international, "919876543210");
    });

    it("should clean +91 prefix and formatting characters", () => {
      const res = normalizeIndianPhone("+91 (98765) 43-210");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.tenDigit, "9876543210");
      assert.strictEqual(res.international, "919876543210");
    });

    it("should strip leading 0 from 11-digit landline/STD format", () => {
      const res = normalizeIndianPhone("09876543210");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.tenDigit, "9876543210");
      assert.strictEqual(res.international, "919876543210");
    });

    it("should reject invalid numbers not starting with 6, 7, 8, or 9", () => {
      const res = normalizeIndianPhone("5123456789");
      assert.strictEqual(res.isValid, false);
    });

    it("should reject numbers with wrong lengths", () => {
      assert.strictEqual(normalizeIndianPhone("98765").isValid, false);
      assert.strictEqual(normalizeIndianPhone("9876543210999").isValid, false);
      assert.strictEqual(normalizeIndianPhone("").isValid, false);
    });
  });

  describe("Message Template Formatting", () => {
    const mockTenant = {
      businessName: "Ziona Electricals",
      legalName: "Ziona Electricals Private Limited",
      gstin: "32AAAAA0000A1Z5",
      phone: "9876543210",
      upiId: "ziona@upi",
      address: "MG Road, Kochi, Kerala",
    };

    it("should format statutory GST tax invoice WhatsApp summary", () => {
      const mockInvoice = {
        invoiceNumber: "INV-2627-0042",
        invoiceDate: new Date("2026-09-19T10:00:00.000Z"),
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        subtotal: 1000,
        totalTax: 180,
        totalAmount: 1180,
        paidAmount: 1180,
        dueAmount: 0,
        paymentMode: "UPI",
        items: [
          {
            productName: "Copper Cable 2.5mm",
            unitSold: "MTR",
            quantity: 20,
            unitPrice: 50,
            lineTotal: 1000,
          },
        ],
      };

      const msg = buildInvoiceMessage(mockInvoice, mockTenant);
      assert.ok(msg.includes("TAX INVOICE — ZIONA ELECTRICALS"));
      assert.ok(msg.includes("INV-2627-0042"));
      assert.ok(msg.includes("Rahul Sharma"));
      assert.ok(msg.includes("Copper Cable 2.5mm (20 MTR) : ₹1000.00"));
      assert.ok(msg.includes("Grand Total: ₹1180.00"));
      assert.ok(msg.includes("GSTIN: `32AAAAA0000A1Z5`"));
    });

    it("should include UPI payment link when balance is due", () => {
      const mockInvoiceDue = {
        invoiceNumber: "INV-2627-0043",
        invoiceDate: new Date("2026-09-19T10:00:00.000Z"),
        customerName: "Anoop Kumar",
        customerPhone: "9876543210",
        subtotal: 500,
        totalTax: 90,
        totalAmount: 590,
        paidAmount: 0,
        dueAmount: 590,
        paymentMode: "CREDIT",
        items: [
          {
            productName: "LED Bulb 9W",
            unitSold: "PCS",
            quantity: 5,
            unitPrice: 100,
            lineTotal: 500,
          },
        ],
      };

      const msg = buildInvoiceMessage(mockInvoiceDue, mockTenant);
      assert.ok(msg.includes("Balance Due: ₹590.00"));
      assert.ok(msg.includes("upi://pay?pa=ziona@upi"));
    });

    it("should format Khata payment reminder correctly", () => {
      const mockCustomer = {
        name: "Suresh Menon",
        outstandingBalance: 3450.5,
      };

      const msg = buildKhataReminderMessage(mockCustomer, mockTenant);
      assert.ok(msg.includes("Payment Reminder — Ziona Electricals"));
      assert.ok(msg.includes("Suresh Menon"));
      assert.ok(msg.includes("₹3450.50"));
      assert.ok(msg.includes("upi://pay?pa=ziona@upi"));
    });
  });

  describe("Gateway Dispatch & Sandbox Simulation", () => {
    it("should gracefully simulate WhatsApp dispatch when API keys are not provided", async () => {
      const result = await sendWhatsAppMessage({
        recipientPhone: "9876543210",
        message: "Hello from SmartVyapar automated test",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.channel, "WHATSAPP");
      assert.strictEqual(result.provider, "SIMULATOR");
      assert.strictEqual(result.recipientPhone, "919876543210");
      assert.ok(result.messageId.startsWith("wamid_sim_"));
    });

    it("should reject WhatsApp dispatch for invalid phone numbers", async () => {
      await assert.rejects(
        async () => {
          await sendWhatsAppMessage({
            recipientPhone: "invalid_phone",
            message: "Test message",
          });
        },
        /Invalid Indian phone number/,
        "Must throw error on invalid phone"
      );
    });

    it("should gracefully simulate SMS dispatch when API keys are not provided", async () => {
      const result = await sendSmsMessage({
        recipientPhone: "9876543210",
        message: "Your OTP is 123456",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.channel, "SMS");
      assert.strictEqual(result.provider, "SIMULATOR");
      assert.strictEqual(result.recipientPhone, "9876543210");
      assert.ok(result.messageId.startsWith("sms_sim_"));
    });

    it("should reject SMS dispatch for invalid phone numbers", async () => {
      await assert.rejects(
        async () => {
          await sendSmsMessage({
            recipientPhone: "123",
            message: "Test message",
          });
        },
        /Invalid Indian phone number/,
        "Must throw error on invalid phone"
      );
    });
  });
});
