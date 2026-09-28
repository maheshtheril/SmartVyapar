const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.updateMany({
    data: {
      enableTerritory: true
    }
  });
  console.log('Enabled Territory management for all tenants.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
