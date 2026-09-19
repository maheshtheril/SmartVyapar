import { prisma } from "@/lib/prisma";
import { AccountClassification } from "@prisma/client";

export interface TrialBalanceItem {
  id: string;
  code: string;
  name: string;
  classification: AccountClassification;
  debit: number;
  credit: number;
  netBalance: number;
}

export interface TrialBalanceReport {
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
  generatedAt: string;
}

export interface ProfitAndLossReport {
  operatingRevenue: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  otherIncome: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  totalRevenue: number;
  cogsAndDirectCosts: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  totalExpenses: number;
  netProfit: number;
  netProfitMargin: number;
  generatedAt: string;
}

export interface BalanceSheetReport {
  assets: {
    currentAssets: { code: string; name: string; amount: number }[];
    totalCurrentAssets: number;
    fixedAssets: { code: string; name: string; amount: number }[];
    totalFixedAssets: number;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: { code: string; name: string; amount: number }[];
    totalCurrentLiabilities: number;
    longTermLiabilities: { code: string; name: string; amount: number }[];
    totalLongTermLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    capitalAccounts: { code: string; name: string; amount: number }[];
    totalCapital: number;
    currentPeriodNetProfit: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;
  generatedAt: string;
}

export interface LedgerStatementLine {
  id: string;
  date: string;
  voucherNumber: string;
  voucherType: string;
  narration: string;
  referenceNo?: string | null;
  contraAccountName: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LedgerStatementReport {
  account: {
    id: string;
    code: string;
    name: string;
    classification: AccountClassification;
  };
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  transactions: LedgerStatementLine[];
  generatedAt: string;
}

/**
 * Generates the Trial Balance for a tenant
 */
export async function getTrialBalance(
  tenantId: string,
  _options?: { fromDate?: Date; toDate?: Date }
): Promise<TrialBalanceReport> {
  const accounts = await prisma.account.findMany({
    where: { tenantId, isActive: true },
    orderBy: { code: "asc" },
  });

  const items: TrialBalanceItem[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const acc of accounts) {
    const bal = Number(acc.balance);
    let debit = 0;
    let credit = 0;

    if (acc.classification === "ASSET" || acc.classification === "EXPENSE") {
      // Normal Debit
      if (bal >= 0) {
        debit = bal;
      } else {
        credit = Math.abs(bal);
      }
    } else {
      // Normal Credit (LIABILITY, EQUITY, REVENUE)
      if (bal >= 0) {
        credit = bal;
      } else {
        debit = Math.abs(bal);
      }
    }

    totalDebit += debit;
    totalCredit += credit;

    items.push({
      id: acc.id,
      code: acc.code,
      name: acc.name,
      classification: acc.classification,
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      netBalance: Math.round(bal * 100) / 100,
    });
  }

  const roundedDebit = Math.round(totalDebit * 100) / 100;
  const roundedCredit = Math.round(totalCredit * 100) / 100;
  const difference = Math.round((roundedDebit - roundedCredit) * 100) / 100;

  return {
    items,
    totalDebit: roundedDebit,
    totalCredit: roundedCredit,
    difference,
    isBalanced: Math.abs(difference) <= 0.05,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates the Profit & Loss Statement
 */
export async function getProfitAndLoss(
  tenantId: string,
  _options?: { fromDate?: Date; toDate?: Date }
): Promise<ProfitAndLossReport> {
  const accounts = await prisma.account.findMany({
    where: {
      tenantId,
      isActive: true,
      classification: { in: ["REVENUE", "EXPENSE"] },
    },
    orderBy: { code: "asc" },
  });

  const operatingRevenueList: { code: string; name: string; amount: number }[] = [];
  const otherIncomeList: { code: string; name: string; amount: number }[] = [];
  let operatingRevenueTotal = 0;
  let otherIncomeTotal = 0;

  const cogsList: { code: string; name: string; amount: number }[] = [];
  const operatingExpenseList: { code: string; name: string; amount: number }[] = [];
  let cogsTotal = 0;
  let operatingExpenseTotal = 0;

  for (const acc of accounts) {
    const bal = Number(acc.balance);

    if (acc.classification === "REVENUE") {
      // Revenue accounts: normal credit balance
      if (acc.code.startsWith("40") || acc.code.startsWith("41")) {
        operatingRevenueList.push({ code: acc.code, name: acc.name, amount: bal });
        operatingRevenueTotal += bal;
      } else {
        // Discounts, interest, other income
        otherIncomeList.push({ code: acc.code, name: acc.name, amount: bal });
        otherIncomeTotal += bal;
      }
    } else if (acc.classification === "EXPENSE") {
      // Expense accounts: normal debit balance
      if (acc.code === "5000" || acc.code === "5400" || acc.name.toLowerCase().includes("cost of goods") || acc.name.toLowerCase().includes("freight")) {
        cogsList.push({ code: acc.code, name: acc.name, amount: bal });
        cogsTotal += bal;
      } else {
        operatingExpenseList.push({ code: acc.code, name: acc.name, amount: bal });
        operatingExpenseTotal += bal;
      }
    }
  }

  const totalRevenue = operatingRevenueTotal + otherIncomeTotal;
  const grossProfit = operatingRevenueTotal - cogsTotal;
  const grossProfitMargin = operatingRevenueTotal > 0 ? (grossProfit / operatingRevenueTotal) * 100 : 0;
  const totalExpenses = cogsTotal + operatingExpenseTotal;
  const netProfit = totalRevenue - totalExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    operatingRevenue: {
      accounts: operatingRevenueList,
      total: Math.round(operatingRevenueTotal * 100) / 100,
    },
    otherIncome: {
      accounts: otherIncomeList,
      total: Math.round(otherIncomeTotal * 100) / 100,
    },
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    cogsAndDirectCosts: {
      accounts: cogsList,
      total: Math.round(cogsTotal * 100) / 100,
    },
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossProfitMargin: Math.round(grossProfitMargin * 10) / 10,
    operatingExpenses: {
      accounts: operatingExpenseList,
      total: Math.round(operatingExpenseTotal * 100) / 100,
    },
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netProfitMargin: Math.round(netProfitMargin * 10) / 10,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates the Balance Sheet
 */
export async function getBalanceSheet(
  tenantId: string,
  _options?: { asOfDate?: Date }
): Promise<BalanceSheetReport> {
  const accounts = await prisma.account.findMany({
    where: {
      tenantId,
      isActive: true,
      classification: { in: ["ASSET", "LIABILITY", "EQUITY"] },
    },
    orderBy: { code: "asc" },
  });

  // Calculate Net Profit from P&L to include in Equity section
  const pnl = await getProfitAndLoss(tenantId);
  const currentPeriodNetProfit = pnl.netProfit;

  const currentAssets: { code: string; name: string; amount: number }[] = [];
  const fixedAssets: { code: string; name: string; amount: number }[] = [];
  let totalCurrentAssets = 0;
  let totalFixedAssets = 0;

  const currentLiabilities: { code: string; name: string; amount: number }[] = [];
  const longTermLiabilities: { code: string; name: string; amount: number }[] = [];
  let totalCurrentLiabilities = 0;
  let totalLongTermLiabilities = 0;

  const capitalAccounts: { code: string; name: string; amount: number }[] = [];
  let totalCapital = 0;

  for (const acc of accounts) {
    const bal = Number(acc.balance);

    if (acc.classification === "ASSET") {
      // Fixed assets typically coded >= 1500 or containing Property, Plant, Equipment, Vehicle
      if (Number(acc.code) >= 1500 || acc.name.toLowerCase().includes("equipment") || acc.name.toLowerCase().includes("furniture")) {
        fixedAssets.push({ code: acc.code, name: acc.name, amount: bal });
        totalFixedAssets += bal;
      } else {
        currentAssets.push({ code: acc.code, name: acc.name, amount: bal });
        totalCurrentAssets += bal;
      }
    } else if (acc.classification === "LIABILITY") {
      // Long-term loans typically >= 2500
      if (Number(acc.code) >= 2500 || acc.name.toLowerCase().includes("loan") || acc.name.toLowerCase().includes("mortgage")) {
        longTermLiabilities.push({ code: acc.code, name: acc.name, amount: bal });
        totalLongTermLiabilities += bal;
      } else {
        currentLiabilities.push({ code: acc.code, name: acc.name, amount: bal });
        totalCurrentLiabilities += bal;
      }
    } else if (acc.classification === "EQUITY") {
      capitalAccounts.push({ code: acc.code, name: acc.name, amount: bal });
      totalCapital += bal;
    }
  }

  const totalAssets = Math.round((totalCurrentAssets + totalFixedAssets) * 100) / 100;
  const totalLiabilities = Math.round((totalCurrentLiabilities + totalLongTermLiabilities) * 100) / 100;
  const totalEquity = Math.round((totalCapital + currentPeriodNetProfit) * 100) / 100;
  const totalLiabilitiesAndEquity = Math.round((totalLiabilities + totalEquity) * 100) / 100;
  const difference = Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100;

  return {
    assets: {
      currentAssets,
      totalCurrentAssets: Math.round(totalCurrentAssets * 100) / 100,
      fixedAssets,
      totalFixedAssets: Math.round(totalFixedAssets * 100) / 100,
      totalAssets,
    },
    liabilities: {
      currentLiabilities,
      totalCurrentLiabilities: Math.round(totalCurrentLiabilities * 100) / 100,
      longTermLiabilities,
      totalLongTermLiabilities: Math.round(totalLongTermLiabilities * 100) / 100,
      totalLiabilities,
    },
    equity: {
      capitalAccounts,
      totalCapital: Math.round(totalCapital * 100) / 100,
      currentPeriodNetProfit: Math.round(currentPeriodNetProfit * 100) / 100,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    difference,
    isBalanced: Math.abs(difference) <= 0.05,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates an Account Statement / General Ledger for a specific account
 */
export async function getAccountStatement(
  tenantId: string,
  accountId: string,
  options?: { fromDate?: Date; toDate?: Date }
): Promise<LedgerStatementReport> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account || account.tenantId !== tenantId) {
    throw new Error("Account not found or access denied");
  }

  // Fetch all line items with journal entry info
  const lineItems = await prisma.journalLineItem.findMany({
    where: {
      accountId,
      journalEntry: {
        tenantId,
        ...(options?.fromDate || options?.toDate
          ? {
              date: {
                ...(options?.fromDate ? { gte: options.fromDate } : {}),
                ...(options?.toDate ? { lte: options.toDate } : {}),
              },
            }
          : {}),
      },
    },
    include: {
      journalEntry: {
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      },
    },
    orderBy: [
      { journalEntry: { date: "asc" } },
      { journalEntry: { createdAt: "asc" } },
    ],
  });

  const isDebitNormal = account.classification === "ASSET" || account.classification === "EXPENSE";

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const transactions: LedgerStatementLine[] = lineItems.map((item) => {
    const dr = Number(item.debit);
    const cr = Number(item.credit);
    totalDebit += dr;
    totalCredit += cr;

    if (isDebitNormal) {
      runningBalance += dr - cr;
    } else {
      runningBalance += cr - dr;
    }

    // Determine contra account name (the other accounts on the same voucher)
    const otherLines = item.journalEntry.lines.filter((l) => l.id !== item.id);
    const contraAccountName = otherLines.length > 0
      ? otherLines.map((l) => l.account.name).join(", ")
      : "Sundry / Multiple";

    return {
      id: item.id,
      date: item.journalEntry.date.toISOString(),
      voucherNumber: item.journalEntry.voucherNumber,
      voucherType: item.journalEntry.voucherType,
      narration: item.narration || item.journalEntry.narration,
      referenceNo: item.journalEntry.referenceNo,
      contraAccountName,
      debit: dr,
      credit: cr,
      runningBalance: Math.round(runningBalance * 100) / 100,
    };
  });

  // If no transactions exist in the journal yet, closingBalance matches account.balance
  const closingBalance = transactions.length > 0
    ? runningBalance
    : Number(account.balance);

  return {
    account: {
      id: account.id,
      code: account.code,
      name: account.name,
      classification: account.classification,
    },
    openingBalance: 0,
    closingBalance: Math.round(closingBalance * 100) / 100,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    netMovement: Math.round((totalDebit - totalCredit) * 100) / 100,
    transactions,
    generatedAt: new Date().toISOString(),
  };
}
