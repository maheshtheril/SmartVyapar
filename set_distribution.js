const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.updateMany({
    data: {
      businessType: "DISTRIBUTION"
    }
  });
  console.log('Updated all tenants to DISTRIBUTION');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
