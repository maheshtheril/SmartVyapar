const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const invoices = await prisma.invoice.findMany({ where: { tenantId: 'b616d8df-de8f-4822-a8d8-c24491cc6fbb' }, select: { invoiceNumber: true, isCancelled: true, paymentStatus: true } });
  console.log('User invoices count:', invoices.length);
  console.log(invoices);
}
main().finally(() => prisma.$disconnect());
