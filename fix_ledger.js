const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLedger() {
  const accounts = await prisma.account.findMany();
  
  for (const account of accounts) {
    let newBalance = 0;

    // 1. Add up from Purchase Bills
    if (account.code === "1300") { // Inventory Asset
      const bills = await prisma.purchaseBill.findMany({ where: { tenantId: account.tenantId } });
      newBalance += bills.reduce((sum, b) => sum + Number(b.totalTaxable), 0);
    }
    if (account.code === "1410") { // CGST Input
      const bills = await prisma.purchaseBill.findMany({ where: { tenantId: account.tenantId } });
      newBalance += bills.reduce((sum, b) => sum + Number(b.cgstAmount), 0);
    }
    if (account.code === "1420") { // SGST Input
      const bills = await prisma.purchaseBill.findMany({ where: { tenantId: account.tenantId } });
      newBalance += bills.reduce((sum, b) => sum + Number(b.sgstAmount), 0);
    }
    if (account.code === "1430") { // IGST Input
      const bills = await prisma.purchaseBill.findMany({ where: { tenantId: account.tenantId } });
      newBalance += bills.reduce((sum, b) => sum + Number(b.igstAmount), 0);
    }
    if (account.code === "2000") { // Accounts Payable
      const bills = await prisma.purchaseBill.findMany({ where: { tenantId: account.tenantId, paymentTerms: 'CREDIT' } });
      newBalance += bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    }
    if (account.code === "1000") { // Cash
      const bills = await prisma.purchaseBill.findMany({ where: { tenantId: account.tenantId, paymentTerms: 'CASH' } });
      newBalance -= bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    }
    if (account.code === "1010") { // Bank
      const bills = await prisma.purchaseBill.findMany({ where: { tenantId: account.tenantId, paymentTerms: { in: ['BANK_TRANSFER', 'UPI'] } } });
      newBalance -= bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    }

    // 2. Add up from Journal Entries
    const lines = await prisma.journalLineItem.findMany({
      where: { accountId: account.id }
    });

    for (const line of lines) {
      if (account.classification === "ASSET" || account.classification === "EXPENSE") {
        newBalance += (Number(line.debit) - Number(line.credit));
      } else {
        newBalance += (Number(line.credit) - Number(line.debit));
      }
    }

    // Update account
    await prisma.account.update({
      where: { id: account.id },
      data: { balance: newBalance }
    });
    console.log(`Updated ${account.name} (${account.code}) to ${newBalance}`);
  }
}

fixLedger().then(() => console.log('Done')).catch(console.error);
