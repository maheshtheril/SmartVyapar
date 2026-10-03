const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'b616d8df-de8f-4822-a8d8-c24491cc6fbb';
  
  // Set Accounts Receivable (1200) to 0
  const ar = await prisma.account.updateMany({
    where: { tenantId, code: "1200" },
    data: { balance: 0 }
  });
  
  // Set Inventory Asset (1300) to 0
  const inv = await prisma.account.updateMany({
    where: { tenantId, code: "1300" },
    data: { balance: 0 }
  });
  
  console.log(`Reset balances. 1200: ${ar.count}, 1300: ${inv.count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
