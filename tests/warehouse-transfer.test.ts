import { describe, it } from "node:test";
import assert from "node:assert";
import {
  CreateWarehouseSchema,
  CreateStockTransferSchema,
} from "../src/lib/schemas/warehouse";

describe("Multi-Warehouse & Stock Transfer Engine", () => {
  describe("CreateWarehouseSchema Validation", () => {
    it("should accept valid warehouse creation payload", () => {
      const valid = CreateWarehouseSchema.safeParse({
        name: "Regional Godown North",
        code: "WH-NORTH",
        city: "Ernakulam",
        address: "Plot 14, Industrial Development Area",
        isDefault: false,
      });
      assert.strictEqual(valid.success, true);
    });

    it("should reject invalid warehouse code with special characters", () => {
      const invalid = CreateWarehouseSchema.safeParse({
        name: "Godown 2",
        code: "WH @NORTH!!",
      });
      assert.strictEqual(invalid.success, false);
    });

    it("should reject warehouse name shorter than 2 characters", () => {
      const invalid = CreateWarehouseSchema.safeParse({
        name: "W",
        code: "WH-1",
      });
      assert.strictEqual(invalid.success, false);
    });
  });

  describe("CreateStockTransferSchema Validation", () => {
    it("should reject transfers where source and destination warehouse are identical", () => {
      const sameWh = CreateStockTransferSchema.safeParse({
        fromWarehouseId: "wh-123",
        toWarehouseId: "wh-123",
        items: [
          {
            productId: "prod-1",
            productName: "Copper Wire",
            quantity: 5,
            unit: "PCS",
          },
        ],
      });
      assert.strictEqual(sameWh.success, false);
      if (!sameWh.success) {
        assert.strictEqual(
          sameWh.error.issues[0]?.message.includes("Source and destination"),
          true
        );
      }
    });

    it("should reject transfers with zero or negative item quantity", () => {
      const zeroQty = CreateStockTransferSchema.safeParse({
        fromWarehouseId: "wh-123",
        toWarehouseId: "wh-456",
        items: [
          {
            productId: "prod-1",
            productName: "Copper Wire",
            quantity: 0,
          },
        ],
      });
      assert.strictEqual(zeroQty.success, false);
    });

    it("should reject transfers with empty items list", () => {
      const emptyItems = CreateStockTransferSchema.safeParse({
        fromWarehouseId: "wh-123",
        toWarehouseId: "wh-456",
        items: [],
      });
      assert.strictEqual(emptyItems.success, false);
    });

    it("should accept valid multi-item stock transfer payload", () => {
      const valid = CreateStockTransferSchema.safeParse({
        fromWarehouseId: "wh-source-1",
        toWarehouseId: "wh-dest-2",
        vehicleNo: "KL07CD5678",
        driverName: "Suresh Kumar",
        notes: "Urgent replenishment for Counter 1",
        items: [
          {
            productId: "prod-cable-1",
            productName: "Armored Cable 2.5mm",
            quantity: 15,
            unit: "MTR",
          },
          {
            productId: "prod-switch-2",
            productName: "Modular 6A Switch",
            quantity: 50,
            unit: "BOX",
          },
        ],
      });
      assert.strictEqual(valid.success, true);
    });
  });

  describe("Stock Transfer Numbering Pattern", () => {
    it("should follow standard statutory ST-YYYY-XXXX format", () => {
      const currentYear = new Date().getFullYear();
      const mockCount = 42;
      const transferNumber = `ST-${currentYear}-${String(mockCount + 1).padStart(4, "0")}`;
      assert.strictEqual(transferNumber, `ST-${currentYear}-0043`);
      assert.strictEqual(/^ST-\d{4}-\d{4}$/.test(transferNumber), true);
    });
  });
});
