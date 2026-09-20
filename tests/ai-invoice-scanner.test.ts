import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ScannedInvoiceResultSchema,
  ScannedPurchaseItemSchema,
  scanPurchaseInvoiceWithGemini,
} from "../src/lib/ai-invoice-scanner";

describe("AI Invoice Scanner & Pharmaceutical/Medical Verification", () => {
  describe("Medical & Pharmaceutical Invoice Schema Validation", () => {
    test("should correctly validate hospital/pharmaceutical bill with batch and expiry", () => {
      const hospitalInvoice = {
        supplierName: "LifeCare Pharma & Medical Distributors",
        supplierGstin: "32AABCL1234F1Z9",
        billNumber: "MED-INV-2026-881",
        billDate: "2026-09-18",
        items: [
          {
            productName: "Amoxicillin & Potassium Clavulanate 625mg Tablets",
            hsnCode: "3004",
            batchNumber: "AMX-2026-044",
            expiryDate: "2028-05-31",
            unit: "BOX",
            quantity: 20,
            packageSize: 10, // 10 strips per box
            baseUnit: "STRIP",
            baseQuantity: 200,
            purchasePrice: 1100.0,
            baseCostPrice: 110.0,
            mrp: 180.0,
            gstRate: 12.0,
            lineTotal: 22000.0,
          },
          {
            productName: "Paracetamol Infusion 100ml IV",
            hsnCode: "3004",
            batchNumber: "PCM-IV-9921",
            expiryDate: "2027-11-30",
            unit: "BOTTLE",
            quantity: 50,
            packageSize: 1,
            baseUnit: "BOTTLE",
            baseQuantity: 50,
            purchasePrice: 45.0,
            baseCostPrice: 45.0,
            mrp: 85.0,
            gstRate: 12.0,
            lineTotal: 2250.0,
          },
        ],
        totalTaxable: 24250.0,
        cgstAmount: 1455.0,
        sgstAmount: 1455.0,
        igstAmount: 0.0,
        totalAmount: 27160.0,
        confidenceScore: 0.98,
      };

      const parsed = ScannedInvoiceResultSchema.parse(hospitalInvoice);
      assert.equal(parsed.supplierName, "LifeCare Pharma & Medical Distributors");
      assert.equal(parsed.items.length, 2);
      assert.equal(parsed.items[0].productName, "Amoxicillin & Potassium Clavulanate 625mg Tablets");
      assert.equal(parsed.items[0].hsnCode, "3004");
      assert.equal(parsed.items[0].batchNumber, "AMX-2026-044");
      assert.equal(parsed.items[0].expiryDate, "2028-05-31");
      assert.equal(parsed.items[0].baseQuantity, 200);
      assert.equal(parsed.totalAmount, 27160.0);
    });

    test("should reject invoice with negative amounts or missing critical fields", () => {
      assert.throws(() => {
        ScannedInvoiceResultSchema.parse({
          supplierName: "Test Supplier",
          totalAmount: -500, // Invalid negative amount
          items: [],
        });
      });
    });
  });

  describe("Zero Fake Data & Transparent Failure Handling", () => {
    test("should throw an honest error when API key is missing rather than returning fake items", async () => {
      const dummyBase64 = Buffer.from("dummy-invoice-content").toString("base64");
      
      // Call with explicit empty apiKey
      await assert.rejects(
        async () => {
          await scanPurchaseInvoiceWithGemini(dummyBase64, "image/jpeg", "");
        },
        (err: Error) => {
          assert.match(err.message, /Gemini AI OCR is not configured/i);
          return true;
        }
      );
    });

    test("should NEVER return hardcoded automobile parts (Brake Pad / Engine Oil) when scan fails", async () => {
      const dummyBase64 = Buffer.from("dummy-invoice-content").toString("base64");

      try {
        await scanPurchaseInvoiceWithGemini(dummyBase64, "image/jpeg", "AIzaSy_fake_nonexistent_key_test");
        assert.fail("Should have thrown an error");
      } catch (err: any) {
        // Must throw an error, NOT return fake data
        assert.ok(err instanceof Error);
        assert.doesNotMatch(err.message, /Brake Pad Front Set/);
        assert.doesNotMatch(err.message, /Fully Synthetic Engine Oil/);
      }
    });

    test("should format error messages into clean, user-friendly plain English without URLs or SDK traces", () => {
      const { cleanHumanReadableAiError } = require("../src/lib/ai-invoice-scanner");
      
      const rawGoogle404 = "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent: [404 Not Found] models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels";
      const friendly404 = cleanHumanReadableAiError(rawGoogle404);
      assert.doesNotMatch(friendly404, /https:\/\/generativelanguage/);
      assert.doesNotMatch(friendly404, /v1beta/);
      assert.doesNotMatch(friendly404, /ModelService/);
      assert.match(friendly404, /Google AI model is currently unavailable/i);

      const rawGoogle403 = "Your project has been denied access. Please contact support. [403 PERMISSION_DENIED]";
      const friendly403 = cleanHumanReadableAiError(rawGoogle403);
      assert.match(friendly403, /Google Cloud access denied/i);

      const rawGoogleInvalidKey = "API key not valid. Please pass a valid API key. [400 API_KEY_INVALID]";
      const friendlyInvalid = cleanHumanReadableAiError(rawGoogleInvalidKey);
      assert.match(friendlyInvalid, /Google Gemini API key is invalid/i);
    });
  });
});
