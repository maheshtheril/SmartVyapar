const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const invoices = await prisma.invoice.findMany({ where: { isCancelled: false } });
  console.log('Active invoices count:', invoices.length);
}
main().finally(() => prisma.$disconnect());
