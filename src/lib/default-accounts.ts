import { AccountClassification } from "@prisma/client";

export const DEFAULT_ACCOUNTS = [
  // Assets
  { code: "1000", name: "Cash in Hand", classification: AccountClassification.ASSET },
  { code: "1010", name: "Bank Account", classification: AccountClassification.ASSET },
  { code: "1020", name: "UPI Settlement Account", classification: AccountClassification.ASSET },
  { code: "1030", name: "Card Settlement Account", classification: AccountClassification.ASSET },
  { code: "1200", name: "Accounts Receivable", classification: AccountClassification.ASSET },
  { code: "1300", name: "Inventory Asset", classification: AccountClassification.ASSET },
  { code: "1410", name: "Input Tax Credit - CGST", classification: AccountClassification.ASSET },
  { code: "1420", name: "Input Tax Credit - SGST", classification: AccountClassification.ASSET },
  { code: "1430", name: "Input Tax Credit - IGST", classification: AccountClassification.ASSET },
  
  // Liabilities
  { code: "2000", name: "Accounts Payable", classification: AccountClassification.LIABILITY },
  { code: "2200", name: "Output CGST Payable", classification: AccountClassification.LIABILITY },
  { code: "2201", name: "Output SGST Payable", classification: AccountClassification.LIABILITY },
  { code: "2202", name: "Output IGST Payable", classification: AccountClassification.LIABILITY },
  
  // Equity
  { code: "3000", name: "Owner's Equity", classification: AccountClassification.EQUITY },
  
  // Revenue
  { code: "4000", name: "Sales Revenue", classification: AccountClassification.REVENUE },
  { code: "4100", name: "Discount Given", classification: AccountClassification.EXPENSE }, // Contra-revenue
  
  // Expenses
  { code: "5000", name: "Cost of Goods Sold (COGS)", classification: AccountClassification.EXPENSE },
  { code: "5100", name: "Purchase Expense", classification: AccountClassification.EXPENSE },
  { code: "5200", name: "General Expenses", classification: AccountClassification.EXPENSE },
];

export async function seedDefaultAccounts(tx: any, tenantId: string) {
  const accountsToCreate = DEFAULT_ACCOUNTS.map((acc) => ({
    tenantId,
    code: acc.code,
    name: acc.name,
    classification: acc.classification,
  }));

  // Create many doesn't work consistently with sqlite but this is Postgres
  await tx.account.createMany({
    data: accountsToCreate,
    skipDuplicates: true,
  });
}
