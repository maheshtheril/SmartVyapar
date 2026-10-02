const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const bills = await prisma.purchaseBill.findMany({ select: { id: true, tenantId: true, supplierName: true } });
    console.log(bills);
}
main().catch(console.error).finally(() => prisma.$disconnect());
