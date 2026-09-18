import { PrismaClient, AccountClassification } from "@prisma/client";

const prisma = new PrismaClient();

const STANDARD_ACCOUNTS = [
  // 1. ASSETS
  { code: "1000", name: "Cash in Hand (Counter Cash)", classification: AccountClassification.ASSET, balance: 15000 },
  { code: "1010", name: "Bank Current Account (ICICI/HDFC)", classification: AccountClassification.ASSET, balance: 85000 },
  { code: "1050", name: "Accounts Receivable (Debtors / Customer Credit)", classification: AccountClassification.ASSET, balance: 2389.6 },
  { code: "1200", name: "Merchandise Inventory Asset", classification: AccountClassification.ASSET, balance: 45000 },
  { code: "1410", name: "Input Tax Credit - CGST", classification: AccountClassification.ASSET, balance: 1200 },
  { code: "1420", name: "Input Tax Credit - SGST", classification: AccountClassification.ASSET, balance: 1200 },
  { code: "1430", name: "Input Tax Credit - IGST", classification: AccountClassification.ASSET, balance: 0 },

  // 2. LIABILITIES
  { code: "2000", name: "Accounts Payable (Creditors / Distributors)", classification: AccountClassification.LIABILITY, balance: 18000 },
  { code: "2110", name: "Output CGST Payable (Government Dues)", classification: AccountClassification.LIABILITY, balance: 334.8 },
  { code: "2120", name: "Output SGST Payable (Government Dues)", classification: AccountClassification.LIABILITY, balance: 334.8 },
  { code: "2130", name: "Output IGST Payable (Government Dues)", classification: AccountClassification.LIABILITY, balance: 1485 },

  // 3. EQUITY
  { code: "3000", name: "Owner's Capital", classification: AccountClassification.EQUITY, balance: 100000 },
  { code: "3100", name: "Retained Earnings", classification: AccountClassification.EQUITY, balance: 25000 },

  // 4. REVENUE
  { code: "4000", name: "Sales Revenue (Goods & Products)", classification: AccountClassification.REVENUE, balance: 14124.6 },
  { code: "4100", name: "Service & Installation Charges", classification: AccountClassification.REVENUE, balance: 2500 },
  { code: "4200", name: "Purchase Discounts Received", classification: AccountClassification.REVENUE, balance: 450 },

  // 5. EXPENSES
  { code: "5000", name: "Cost of Goods Sold (COGS)", classification: AccountClassification.EXPENSE, balance: 9800 },
  { code: "5100", name: "Store Rent & Property Taxes", classification: AccountClassification.EXPENSE, balance: 12000 },
  { code: "5200", name: "Electricity & Utility Bills", classification: AccountClassification.EXPENSE, balance: 2200 },
  { code: "5300", name: "Staff Salaries & Allowances", classification: AccountClassification.EXPENSE, balance: 18000 },
  { code: "5400", name: "Freight & Delivery Expenses", classification: AccountClassification.EXPENSE, balance: 850 },
];

async function main() {
  console.log("🌱 Seeding Chart of Accounts (COA)...");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: "ziona-electricals" },
  });

  if (!tenant) {
    console.error("Tenant 'ziona-electricals' not found!");
    return;
  }

  for (const acc of STANDARD_ACCOUNTS) {
    await prisma.account.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: acc.code,
        },
      },
      update: {
        name: acc.name,
        classification: acc.classification,
        balance: acc.balance,
      },
      create: {
        tenantId: tenant.id,
        code: acc.code,
        name: acc.name,
        classification: acc.classification,
        balance: acc.balance,
      },
    });
  }

  console.log(`✅ Seeded ${STANDARD_ACCOUNTS.length} Chart of Accounts in Neon DB!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
