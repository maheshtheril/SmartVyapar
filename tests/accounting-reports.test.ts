import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Financial Statements & Reports Calculation Engine", () => {
  describe("Trial Balance Equilibrium Logic", () => {
    test("should compute zero difference when debits and credits are equal", () => {
      const accounts = [
        { code: "1000", name: "Cash", classification: "ASSET", balance: 50000 },
        { code: "1050", name: "Receivables", classification: "ASSET", balance: 15000 },
        { code: "2000", name: "Payables", classification: "LIABILITY", balance: 20000 },
        { code: "3000", name: "Capital", classification: "EQUITY", balance: 45000 },
      ];

      let totalDebit = 0;
      let totalCredit = 0;

      for (const acc of accounts) {
        if (acc.classification === "ASSET" || acc.classification === "EXPENSE") {
          totalDebit += acc.balance;
        } else {
          totalCredit += acc.balance;
        }
      }

      assert.equal(totalDebit, 65000);
      assert.equal(totalCredit, 65000);
      assert.equal(totalDebit - totalCredit, 0);
      assert.ok(Math.abs(totalDebit - totalCredit) <= 0.05);
    });

    test("should correctly classify negative asset balance as credit in trial balance", () => {
      // Overdrawn bank account (negative asset balance)
      const acc = { code: "1010", name: "Bank Overdraft", classification: "ASSET", balance: -5000 };
      let debit = 0;
      let credit = 0;

      if (acc.classification === "ASSET" || acc.classification === "EXPENSE") {
        if (acc.balance >= 0) debit = acc.balance;
        else credit = Math.abs(acc.balance);
      }

      assert.equal(debit, 0);
      assert.equal(credit, 5000);
    });
  });

  describe("Profit & Loss (Income Statement) Formulas", () => {
    test("should calculate correct Gross Profit and Net Profit", () => {
      const revenueAccounts = [
        { code: "4000", name: "Sales Revenue", amount: 100000 },
        { code: "4100", name: "Service Income", amount: 15000 },
        { code: "4200", name: "Discounts Received", amount: 2000 },
      ];

      const expenseAccounts = [
        { code: "5000", name: "COGS", amount: 40000 },
        { code: "5400", name: "Freight Inward", amount: 5000 },
        { code: "5100", name: "Rent Expense", amount: 12000 },
        { code: "5200", name: "Electricity", amount: 3000 },
        { code: "5300", name: "Staff Salaries", amount: 20000 },
      ];

      // Operating revenue (4000, 4100)
      const operatingRevenue = revenueAccounts
        .filter((a) => a.code.startsWith("40") || a.code.startsWith("41"))
        .reduce((sum, a) => sum + a.amount, 0);
      assert.equal(operatingRevenue, 115000);

      // Other income (4200)
      const otherIncome = revenueAccounts
        .filter((a) => !a.code.startsWith("40") && !a.code.startsWith("41"))
        .reduce((sum, a) => sum + a.amount, 0);
      assert.equal(otherIncome, 2000);

      // Direct costs (COGS + freight)
      const directCosts = expenseAccounts
        .filter((a) => a.code === "5000" || a.code === "5400")
        .reduce((sum, a) => sum + a.amount, 0);
      assert.equal(directCosts, 45000);

      // Gross profit = operating revenue - direct costs
      const grossProfit = operatingRevenue - directCosts;
      assert.equal(grossProfit, 70000);

      // Gross profit margin = (70000 / 115000) * 100
      const grossProfitMargin = Math.round((grossProfit / operatingRevenue) * 1000) / 10;
      assert.equal(grossProfitMargin, 60.9);

      // Operating expenses (rent + electricity + salaries)
      const operatingExpenses = expenseAccounts
        .filter((a) => a.code !== "5000" && a.code !== "5400")
        .reduce((sum, a) => sum + a.amount, 0);
      assert.equal(operatingExpenses, 35000);

      // Net profit = Gross profit + other income - operating expenses
      const netProfit = grossProfit + otherIncome - operatingExpenses;
      assert.equal(netProfit, 37000);

      // Net profit margin = (37000 / 117000) * 100
      const totalRevenue = operatingRevenue + otherIncome;
      const netProfitMargin = Math.round((netProfit / totalRevenue) * 1000) / 10;
      assert.equal(netProfitMargin, 31.6);
    });
  });

  describe("Balance Sheet Fundamental Equation", () => {
    test("Assets must exactly match Liabilities + Equity + Net Profit", () => {
      const currentAssets = 85000;
      const fixedAssets = 50000;
      const totalAssets = currentAssets + fixedAssets; // 135,000

      const currentLiabilities = 25000;
      const longTermLiabilities = 30000;
      const totalLiabilities = currentLiabilities + longTermLiabilities; // 55,000

      const capital = 60000;
      const netProfit = 20000;
      const totalEquity = capital + netProfit; // 80,000

      const totalLiabilitiesAndEquity = totalLiabilities + totalEquity; // 135,000

      assert.equal(totalAssets, 135000);
      assert.equal(totalLiabilitiesAndEquity, 135000);
      assert.equal(totalAssets - totalLiabilitiesAndEquity, 0);
    });
  });

  describe("General Ledger Statement Running Balance", () => {
    test("should compute accurate running balance for Asset (Debit Normal)", () => {
      let balance = 0;
      const entries = [
        { debit: 10000, credit: 0 },   // +10000 -> 10000
        { debit: 0, credit: 2500 },    // -2500  -> 7500
        { debit: 5000, credit: 0 },    // +5000  -> 12500
        { debit: 0, credit: 1200 },    // -1200  -> 11300
      ];

      const runningBalances = entries.map((e) => {
        balance += e.debit - e.credit;
        return balance;
      });

      assert.deepEqual(runningBalances, [10000, 7500, 12500, 11300]);
    });

    test("should compute accurate running balance for Liability (Credit Normal)", () => {
      let balance = 0;
      const entries = [
        { debit: 0, credit: 50000 },   // Initial bill: +50000 -> 50000
        { debit: 15000, credit: 0 },   // Part payment: -15000 -> 35000
        { debit: 20000, credit: 0 },   // Second payment: -20000 -> 15000
      ];

      const runningBalances = entries.map((e) => {
        balance += e.credit - e.debit;
        return balance;
      });

      assert.deepEqual(runningBalances, [50000, 35000, 15000]);
    });
  });
});
