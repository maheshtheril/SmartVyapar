import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("Connecting via Prisma...");
  const count = await prisma.user.count();
  console.log("Total users in DB:", count);

  const updatedUsers = await prisma.user.updateMany({
    where: {
      email: {
        contains: "@smartvyapar.app",
      },
    },
    data: {
      // Since updateMany cannot do SQL replace directly, we can fetch their IDs and update one by one or execute raw query
    },
  });

  const raw = await prisma.$executeRawUnsafe(`
    UPDATE users 
    SET email = REPLACE(email, '@smartvyapar.app', '@zionapos.com')
    WHERE email LIKE '%@smartvyapar.app';
  `);
  console.log("Raw SQL updated users:", raw);

  const rawTenant = await prisma.$executeRawUnsafe(`
    UPDATE tenants 
    SET email = REPLACE(email, '@smartvyapar.app', '@zionapos.com')
    WHERE email LIKE '%@smartvyapar.app';
  `);
  console.log("Raw SQL updated tenants:", rawTenant);

}

main()
  .catch((e) => {
    console.error("Prisma error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
