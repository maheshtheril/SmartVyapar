const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('Products:', await prisma.product.count());
    console.log('PurchaseBills:', await prisma.purchaseBill.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
