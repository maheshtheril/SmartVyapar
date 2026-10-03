const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBalances() {
  const accounts = await prisma.account.findMany({
    where: { code: { in: ['1300', '1410', '1420'] } }
  });

  for (const acc of accounts) {
    if (acc.code === '1410' || acc.code === '1420') {
      await prisma.account.update({
        where: { id: acc.id },
        data: { balance: 0 }
      });
      console.log(`Reset ${acc.code} to 0`);
    }
    if (acc.code === '1300') {
      // Find the AP balance for this tenant to match it
      const ap = await prisma.account.findFirst({
        where: { tenantId: acc.tenantId, code: '2000' }
      });
      if (ap) {
        await prisma.account.update({
          where: { id: acc.id },
          data: { balance: ap.balance }
        });
        console.log(`Fixed 1300 to match AP: ${ap.balance}`);
      }
    }
  }
}

fixBalances().catch(console.error).finally(() => prisma.$disconnect());
