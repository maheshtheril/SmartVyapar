import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("⚡ Executing atomic SQL update for emails...");

  const userResult = await prisma.$executeRawUnsafe(`
    UPDATE users 
    SET email = REPLACE(email, '@smartvyapar.app', '@zionapos.com')
    WHERE email LIKE '%@smartvyapar.app';
  `);
  console.log(`Updated users: ${userResult}`);

  const tenantResult = await prisma.$executeRawUnsafe(`
    UPDATE tenants 
    SET email = REPLACE(email, '@smartvyapar.app', '@zionapos.com')
    WHERE email LIKE '%@smartvyapar.app';
  `);
  console.log(`Updated tenants: ${tenantResult}`);

  // Fetch updated users to confirm
  const updatedUsers = await prisma.user.findMany({
    where: {
      email: {
        contains: "@zionapos.com",
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenant: {
        select: {
          slug: true,
          businessName: true,
        },
      },
    },
  });

  console.log("\nCONFIRMED ZIONAPOS USERS IN DB:");
  console.log(JSON.stringify(updatedUsers, null, 2));
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
