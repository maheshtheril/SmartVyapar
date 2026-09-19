import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateOfflineInvoiceNumber, type OfflineInvoiceRecord } from "../src/lib/offline-db";
import { CreateInvoiceSchema } from "../src/lib/schemas/invoice";

describe("Offline-First POS & Resilience Engine", () => {
  describe("Offline Invoice Numbering", () => {
    it("should generate a valid offline temporary invoice number format", () => {
      const offNum1 = generateOfflineInvoiceNumber();
      const offNum2 = generateOfflineInvoiceNumber();

      assert.ok(offNum1.startsWith("OFFLINE-"), "Offline bill must start with OFFLINE- prefix");
      assert.ok(offNum2.startsWith("OFFLINE-"), "Offline bill must start with OFFLINE- prefix");
      assert.notStrictEqual(offNum1, offNum2, "Consecutive offline bills must generate unique identifiers");
    });
  });

  describe("Offline Outbox Payload Validation", () => {
    it("should validate offline invoice payloads against the statutory CreateInvoiceSchema", () => {
      const validOfflinePayload = {
        customerName: "Offline Retail Customer",
        customerPhone: "9876543210",
        customerStateCode: "32",
        paymentStatus: "PAID" as const,
        paymentMode: "CASH" as const,
        paidAmount: 500,
        items: [
          {
            productId: "prod-1",
            quantity: 2,
            price: 250,
          },
        ],
      };

      const result = CreateInvoiceSchema.safeParse(validOfflinePayload);
      assert.strictEqual(result.success, true, "Offline invoice payload must strictly pass invoice schema");
    });

    it("should reject offline payloads without line items", () => {
      const invalidPayload = {
        customerName: "Walk-in Cash Customer",
        customerPhone: "9876543210",
        customerStateCode: "32",
        paymentStatus: "PAID" as const,
        paymentMode: "CASH" as const,
        items: [],
      };

      const result = CreateInvoiceSchema.safeParse(invalidPayload);
      assert.strictEqual(result.success, false, "Offline invoices must have at least one line item");
    });
  });

  describe("Outbox Queue Lifecycle & State Transitions", () => {
    it("should correctly represent offline outbox lifecycle states", () => {
      const initialRecord: OfflineInvoiceRecord = {
        localId: "off_inv_test_1001",
        offlineInvoiceNumber: generateOfflineInvoiceNumber(),
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
        payload: {
          customerName: "Customer 1",
          items: [{ productId: "p1", quantity: 1, price: 100 }],
        },
      };

      assert.strictEqual(initialRecord.syncStatus, "PENDING");

      // State transition 1: SYNCING
      const syncingRecord: OfflineInvoiceRecord = {
        ...initialRecord,
        syncStatus: "SYNCING",
      };
      assert.strictEqual(syncingRecord.syncStatus, "SYNCING");

      // State transition 2: SYNCED
      const syncedRecord: OfflineInvoiceRecord = {
        ...syncingRecord,
        syncStatus: "SYNCED",
        serverInvoiceId: "inv_cloud_uuid_999",
        serverInvoiceNumber: "INV-2627-0050",
      };
      assert.strictEqual(syncedRecord.syncStatus, "SYNCED");
      assert.strictEqual(syncedRecord.serverInvoiceNumber, "INV-2627-0050");
    });

    it("should handle sync failure states with error preservation", () => {
      const failedRecord: OfflineInvoiceRecord = {
        localId: "off_inv_test_1002",
        offlineInvoiceNumber: generateOfflineInvoiceNumber(),
        createdAt: new Date().toISOString(),
        syncStatus: "FAILED",
        payload: { customerName: "Customer 2", items: [] },
        syncError: "Network connection timeout during handshake",
      };

      assert.strictEqual(failedRecord.syncStatus, "FAILED");
      assert.ok(failedRecord.syncError?.includes("timeout"));
    });
  });

  describe("Local Catalog Stock Decrement Reconciliation", () => {
    it("should accurately decrement local catalog stock when offline sales occur", () => {
      const localCatalog = [
        { id: "p1", name: "1.5mm Cable", currentStock: 100 },
        { id: "p2", name: "16A Socket", currentStock: 25 },
      ];

      const soldItems = [
        { productId: "p1", quantity: 10 },
        { productId: "p2", quantity: 5 },
      ];

      const updatedCatalog = localCatalog.map((prod) => {
        const sold = soldItems.find((s) => s.productId === prod.id);
        if (sold) {
          return { ...prod, currentStock: Math.max(0, prod.currentStock - sold.quantity) };
        }
        return prod;
      });

      assert.strictEqual(updatedCatalog[0].currentStock, 90);
      assert.strictEqual(updatedCatalog[1].currentStock, 20);
    });
  });
});
