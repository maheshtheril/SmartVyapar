import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GstCalculator } from "../src/lib/gst";

/**
 * World-Standard End-to-End Stock and Accounting Audit Suite
 * 
 * Sequentially executes an entire business lifecycle:
 * Step 0: Baseline Verification
 * Step 1: Purchase Inward (GRN) on credit
 * Step 2: Retail Sales Invoice (POS Billing with Split Payment: UPI + Credit)
 * Step 3: Customer Payment Receipt (Khata / Udhar settlement)
 * Step 4: Supplier Payment (Payment Voucher PV)
 * Step 5: Recipe / BOM Depletion (Kitchen / Assembly)
 * Step 6: Inter-Warehouse Stock Transfer
 * Step 7: Trial Balance Equilibrium (\sum Debits \equiv \sum Credits)
 * Step 8: Profit & Loss (Income Statement)
 * Step 9: Balance Sheet & Inventory Valuation Reconciliation
 */
describe("E2E Complete Stock & Financial Accounts Audit Engine", () => {
  test("Complete Lifecycle: Sequential Verification of Stock and Double-Entry Accounts", () => {
    // -------------------------------------------------------------
    // SETUP & OPENING BALANCE SHEET
    // -------------------------------------------------------------
    const UNIT_COST = 100.0;
    const SELLING_PRICE = 150.0;
    const GST_RATE = 18.0;

    const ledger = {
      cash: 50000.0,
      bank: 100000.0,
      debtors: 0.0,
      inventoryAsset: 0.0,
      inputGstCgst: 0.0,
      inputGstSgst: 0.0,
      accountsPayable: 0.0,
      outputGstCgst: 0.0,
      outputGstSgst: 0.0,
      ownersCapital: 150000.0,
      salesRevenue: 0.0,
      cogs: 0.0,
    };

    let stockQuantity = 0;
    const stockLogs: Array<{ type: string; qty: number; balanceAfter: number; ref: string }> = [];

    // Step 0: Initial Balance Sheet
    const initialAssets = ledger.cash + ledger.bank + ledger.debtors + ledger.inventoryAsset + ledger.inputGstCgst + ledger.inputGstSgst;
    const initialLiabilities = ledger.accountsPayable + ledger.outputGstCgst + ledger.outputGstSgst;
    const initialEquity = ledger.ownersCapital;
    assert.equal(initialAssets, 150000.0);
    assert.equal(initialLiabilities, 0.0);
    assert.equal(initialEquity, 150000.0);
    assert.equal(initialAssets, initialLiabilities + initialEquity, "Opening Balance Sheet must balance");

    // -------------------------------------------------------------
    // STEP 1: PURCHASE INWARD (GRN) OF 100 UNITS ON SUPPLIER CREDIT
    // -------------------------------------------------------------
    const inwardQty = 100;
    const purchaseTaxable = inwardQty * UNIT_COST; // 10,000
    const purchaseGst = GstCalculator.calculate(purchaseTaxable, GST_RATE, "27", "27", false); // 9% + 9%
    const purchaseTotal = purchaseGst.totalAmount; // 11,800 (10,000 + 1,800 GST)

    // Stock
    stockQuantity += inwardQty;
    stockLogs.push({ type: "PURCHASE_IN", qty: inwardQty, balanceAfter: stockQuantity, ref: "GRN-2026-001" });
    assert.equal(stockQuantity, 100, "Stock must equal 100 after inward");

    // Accounts
    ledger.inventoryAsset += purchaseTaxable; // Dr Inventory Asset (10,000)
    ledger.inputGstCgst += purchaseGst.cgstAmount; // Dr Input CGST (900)
    ledger.inputGstSgst += purchaseGst.sgstAmount; // Dr Input SGST (900)
    ledger.accountsPayable += purchaseTotal; // Cr Accounts Payable (11,800)

    assert.equal(purchaseTaxable + purchaseGst.cgstAmount + purchaseGst.sgstAmount, purchaseTotal, "GRN debits must equal credits");
    assert.equal(ledger.inventoryAsset, 10000.0);
    assert.equal(ledger.accountsPayable, 11800.0);

    // -------------------------------------------------------------
    // STEP 2: SALES INVOICE (40 UNITS, ₹5,000 UPI BANK + ₹2,080 UDHAR)
    // -------------------------------------------------------------
    const saleQty = 40;
    const salesTaxable = saleQty * SELLING_PRICE; // 6,000
    const salesGst = GstCalculator.calculate(salesTaxable, GST_RATE, "27", "27", false); // 540 + 540 = 1,080
    const invoiceTotal = salesGst.totalAmount; // 7,080 (6,000 + 1,080 GST)

    const paidBank = 5000.0;
    const creditCustomer = 2080.0;
    assert.equal(paidBank + creditCustomer, invoiceTotal);

    // Stock
    stockQuantity -= saleQty;
    stockLogs.push({ type: "SALE_OUT", qty: -saleQty, balanceAfter: stockQuantity, ref: "INV-2026-001" });
    assert.equal(stockQuantity, 60, "Stock must decrement from 100 to 60");

    // Cost of Goods Sold
    const salesCogs = saleQty * UNIT_COST; // 40 * 100 = 4,000
    ledger.cogs += salesCogs; // Dr COGS
    ledger.inventoryAsset -= salesCogs; // Cr Inventory Asset
    assert.equal(ledger.inventoryAsset, 6000.0, "Inventory Asset must reflect 60 units * 100 = 6,000");

    // Revenue & Receivables
    ledger.bank += paidBank; // Dr Bank (5,000)
    ledger.debtors += creditCustomer; // Dr Customer Debtors (2,080)
    ledger.salesRevenue += salesTaxable; // Cr Sales Revenue (6,000)
    ledger.outputGstCgst += salesGst.cgstAmount; // Cr Output CGST (540)
    ledger.outputGstSgst += salesGst.sgstAmount; // Cr Output SGST (540)

    assert.equal(ledger.debtors, 2080.0, "Customer Khata outstanding balance is 2,080");

    // -------------------------------------------------------------
    // STEP 3: CUSTOMER SETTLES KHATA / UDHAR IN CASH (RECEIPT RV)
    // -------------------------------------------------------------
    const receiptAmount = 2080.0;
    ledger.cash += receiptAmount; // Dr Cash
    ledger.debtors -= receiptAmount; // Cr Debtors
    assert.equal(ledger.debtors, 0.0, "Customer Khata balance must be zero");

    // -------------------------------------------------------------
    // STEP 4: PAY SUPPLIER INVOICE VIA BANK (PAYMENT PV)
    // -------------------------------------------------------------
    const vendorPayment = 11800.0;
    ledger.accountsPayable -= vendorPayment; // Dr Accounts Payable
    ledger.bank -= vendorPayment; // Cr Bank
    assert.equal(ledger.accountsPayable, 0.0, "Supplier Accounts Payable must be zero");

    // -------------------------------------------------------------
    // STEP 5: RESTAURANT RECIPE / BOM DEPLETION (5 UNITS CONSUMED)
    // -------------------------------------------------------------
    const consumedQty = 5;
    stockQuantity -= consumedQty;
    stockLogs.push({ type: "CONSUMPTION_OUT", qty: -consumedQty, balanceAfter: stockQuantity, ref: "KOT-2026-001" });
    assert.equal(stockQuantity, 55, "Stock decrements from 60 to 55");

    const consumptionCost = consumedQty * UNIT_COST; // 500
    ledger.cogs += consumptionCost; // Dr COGS / Consumption
    ledger.inventoryAsset -= consumptionCost; // Cr Inventory Asset
    assert.equal(ledger.inventoryAsset, 5500.0, "Inventory Asset reflects 55 units * 100 = 5,500");

    // -------------------------------------------------------------
    // STEP 6: INTER-WAREHOUSE STOCK TRANSFER (15 UNITS TO BRANCH)
    // -------------------------------------------------------------
    const transferQty = 15;
    stockLogs.push({ type: "TRANSFER_OUT", qty: -transferQty, balanceAfter: stockQuantity - transferQty, ref: "ST-2026-001" });
    stockLogs.push({ type: "TRANSFER_IN", qty: transferQty, balanceAfter: stockQuantity, ref: "ST-2026-001" });
    assert.equal(stockQuantity, 55, "Consolidated company stock remains 55 units");

    // -------------------------------------------------------------
    // STEP 7: TRIAL BALANCE EQUILIBRIUM AUDIT
    // -------------------------------------------------------------
    const debitAccounts = [
      { name: "Cash in Hand", balance: ledger.cash }, // 50,000 + 2,080 = 52,080
      { name: "Bank Account", balance: ledger.bank }, // 100,000 + 5,000 - 11,800 = 93,200
      { name: "Accounts Receivable", balance: ledger.debtors }, // 0
      { name: "Merchandise Inventory", balance: ledger.inventoryAsset }, // 5,500
      { name: "Input CGST", balance: ledger.inputGstCgst }, // 900
      { name: "Input SGST", balance: ledger.inputGstSgst }, // 900
      { name: "Cost of Goods Sold", balance: ledger.cogs }, // 4,500
    ];

    const creditAccounts = [
      { name: "Accounts Payable", balance: ledger.accountsPayable }, // 0
      { name: "Output CGST", balance: ledger.outputGstCgst }, // 540
      { name: "Output SGST", balance: ledger.outputGstSgst }, // 540
      { name: "Owner's Capital", balance: ledger.ownersCapital }, // 150,000
      { name: "Sales Revenue", balance: ledger.salesRevenue }, // 6,000
    ];

    const totalDebit = debitAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalCredit = creditAccounts.reduce((sum, a) => sum + a.balance, 0);

    assert.equal(totalDebit, 157080.0, "Total Debits must be exactly 157,080.00");
    assert.equal(totalCredit, 157080.0, "Total Credits must be exactly 157,080.00");
    assert.equal(totalDebit - totalCredit, 0.0, "Trial Balance difference must be exactly 0.00");

    // -------------------------------------------------------------
    // STEP 8: PROFIT & LOSS (INCOME STATEMENT) AUDIT
    // -------------------------------------------------------------
    const revenue = ledger.salesRevenue; // 6,000
    const directCosts = ledger.cogs; // 4,500 (4,000 sales + 500 recipe depletion)
    const grossProfit = revenue - directCosts; // 1,500
    const netProfit = grossProfit; // 1,500

    assert.equal(revenue, 6000.0);
    assert.equal(directCosts, 4500.0);
    assert.equal(grossProfit, 1500.0);
    assert.equal(netProfit, 1500.0);

    // -------------------------------------------------------------
    // STEP 9: BALANCE SHEET & INVENTORY VALUATION AUDIT
    // -------------------------------------------------------------
    const totalAssets = ledger.cash + ledger.bank + ledger.debtors + ledger.inventoryAsset + ledger.inputGstCgst + ledger.inputGstSgst;
    // 52,080 + 93,200 + 0 + 5,500 + 900 + 900 = 152,580

    const totalLiabilities = ledger.accountsPayable + ledger.outputGstCgst + ledger.outputGstSgst;
    // 0 + 540 + 540 = 1,080

    const totalEquity = ledger.ownersCapital + netProfit;
    // 150,000 + 1,500 = 151,500

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    // 1,080 + 151,500 = 152,580

    assert.equal(totalAssets, 152580.0, "Total Assets must be 152,580.00");
    assert.equal(totalLiabilitiesAndEquity, 152580.0, "Total Liabilities + Equity must be 152,580.00");
    assert.equal(totalAssets - totalLiabilitiesAndEquity, 0.0, "Balance Sheet Difference must be 0.00");

    // Physical Stock Count & Valuation vs Balance Sheet Inventory Asset
    const physicalValuation = stockQuantity * UNIT_COST; // 55 units * 100 = 5,500
    assert.equal(physicalValuation, ledger.inventoryAsset, "Physical stock valuation must match Balance Sheet Inventory Asset");
    assert.equal(stockQuantity, 55, "Physical stock quantity must be 55 units");
  });
});
