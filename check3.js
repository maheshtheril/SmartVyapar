const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const invoices = await prisma.invoice.findMany({ select: { invoiceNumber: true, isCancelled: true, tenantId: true } });
  console.log(invoices);
}
main().finally(() => prisma.$disconnect());
