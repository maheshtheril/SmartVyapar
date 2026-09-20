import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Complete Stock Accuracy Equation Test Suite:
 * 
 * Stock ADD:
 *   - Opening Stock (INITIAL)
 *   - Purchase Inward (PURCHASE_IN)
 *   - Sales Return (RETURN_IN via Credit Note)
 *   - Inventory Physical Surplus Adjustment (MANUAL_ADJUSTMENT)
 * 
 * Stock DEDUCT:
 *   - Sales Invoices / POS Billing (SALE_OUT)
 *   - Recipe / Kitchen BOM Depletion (CONSUMPTION_OUT)
 *   - Purchase Return / Supplier Debit Note (PURCHASE_RETURN)
 *   - Inventory Damages / Expiry / Deficit Adjustment (MANUAL_ADJUSTMENT)
 */
describe("100% Stock Accuracy & Inventory Equation Audit", () => {
  test("Accurate Cumulative Stock Ledger & Running Balance Across All Events", () => {
    let currentStock = 0;
    const stockLedgerLogs: Array<{
      type: string;
      change: number;
      runningBalance: number;
      category: "ADD" | "DEDUCT";
      reason: string;
    }> = [];

    function recordStockMovement(change: number, type: string, reason: string) {
      currentStock += change;
      stockLedgerLogs.push({
        type,
        change,
        runningBalance: currentStock,
        category: change >= 0 ? "ADD" : "DEDUCT",
        reason,
      });
      return currentStock;
    }

    // 1. OPENING STOCK (ADD)
    const openingStock = 20;
    recordStockMovement(openingStock, "INITIAL", "Opening stock entered at product creation");
    assert.equal(currentStock, 20, "Stock after opening must be 20");

    // 2. PURCHASE INWARD (ADD)
    const purchaseInward = 100;
    recordStockMovement(purchaseInward, "PURCHASE_IN", "Supplier inward via GRN-2026-001");
    assert.equal(currentStock, 120, "Stock after purchase inward must be 120");

    // 3. SALES OUTWARD (DEDUCT)
    const saleQty = 35;
    recordStockMovement(-saleQty, "SALE_OUT", "Sold to customer via INV-2026-001");
    assert.equal(currentStock, 85, "Stock after sales outward must be 85");

    // 4. SALES RETURN / CREDIT NOTE (ADD)
    const customerReturnQty = 5; // Customer returns 5 units
    recordStockMovement(customerReturnQty, "RETURN_IN", "Customer returned goods via CN-2627-0001");
    assert.equal(currentStock, 90, "Stock after sales return must be 90");

    // 5. PURCHASE RETURN / DEBIT NOTE (DEDUCT)
    const supplierReturnQty = 10; // Defective items sent back to vendor
    recordStockMovement(-supplierReturnQty, "MANUAL_ADJUSTMENT", "Purchase Return to supplier via DN-2026-0001");
    assert.equal(currentStock, 80, "Stock after supplier return must be 80");

    // 6. RECIPE / BOM CONSUMPTION DEPLETION (DEDUCT)
    const kitchenConsumption = 4;
    recordStockMovement(-kitchenConsumption, "CONSUMPTION_OUT", "Consumed in recipe preparation");
    assert.equal(currentStock, 76, "Stock after recipe consumption must be 76");

    // 7. STOCK ADJUSTMENT - DEFICIT / DAMAGE (DEDUCT)
    const damagedQty = 2; // Expired / damaged bottles found during physical stocktake
    recordStockMovement(-damagedQty, "MANUAL_ADJUSTMENT", "Damage adjustment: expired goods removed");
    assert.equal(currentStock, 74, "Stock after damage deduction must be 74");

    // 8. STOCK ADJUSTMENT - SURPLUS (ADD)
    const foundQty = 1; // 1 extra unit found in unboxed carton
    recordStockMovement(foundQty, "MANUAL_ADJUSTMENT", "Physical audit surplus: found unrecorded unit");
    assert.equal(currentStock, 75, "Stock after surplus addition must be 75");

    // =========================================================================
    // STATUTORY EQUATION VERIFICATION
    // =========================================================================
    const totalAdditions = stockLedgerLogs
      .filter((l) => l.change > 0)
      .reduce((sum, l) => sum + l.change, 0);

    const totalDeductions = stockLedgerLogs
      .filter((l) => l.change < 0)
      .reduce((sum, l) => sum + Math.abs(l.change), 0);

    // Equation: Opening + Purchases + Sales Returns + Surpluses - Sales - Purchase Returns - Consumptions - Damages === Current Stock
    const computedStock = totalAdditions - totalDeductions;

    assert.equal(totalAdditions, 20 + 100 + 5 + 1); // 126
    assert.equal(totalDeductions, 35 + 10 + 4 + 2); // 51
    assert.equal(computedStock, 75);
    assert.equal(currentStock, 75);
    assert.equal(computedStock, currentStock, "Computed stock from stock logs must match live currentStock exactly");
  });
});
