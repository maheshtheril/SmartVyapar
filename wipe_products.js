const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'b616d8df-de8f-4822-a8d8-c24491cc6fbb';
  
  const result = await prisma.product.deleteMany({
    where: { tenantId }
  });
  
  console.log(`Successfully deleted ${result.count} products from tenant BROTHERS AUTOMOBILE AGENCIES.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
