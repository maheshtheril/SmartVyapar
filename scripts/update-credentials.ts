import { prisma } from "../src/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const SHARED_PASSWORD = "ZionaPOS@2026";

const EMAIL_MAPPINGS = [
  {
    oldEmail: "retail.demo@smartvyapar.app",
    newEmail: "retail.demo@zionapos.com",
    slug: "demo-retail",
    name: "Bazaar Store Manager",
    phone: "+91 98765 00001",
  },
  {
    oldEmail: "restaurant.demo@smartvyapar.app",
    newEmail: "restaurant.demo@zionapos.com",
    slug: "demo-restaurant",
    name: "Chef Executive / General Manager",
    phone: "+91 98765 00002",
  },
  {
    oldEmail: "garage.demo@smartvyapar.app",
    newEmail: "garage.demo@zionapos.com",
    slug: "demo-garage",
    name: "Workshop Service Manager",
    phone: "+91 98765 00003",
  },
  {
    oldEmail: "distribution.demo@smartvyapar.app",
    newEmail: "distribution.demo@zionapos.com",
    slug: "demo-distribution",
    name: "Distribution Operations Head",
    phone: "+91 98765 00004",
  },
  {
    oldEmail: "pharma.demo@smartvyapar.app",
    newEmail: "pharma.demo@zionapos.com",
    slug: "demo-pharma",
    name: "Chief Pharmacist & Compliance Officer",
    phone: "+91 98765 00005",
  },
  {
    oldEmail: "services.demo@smartvyapar.app",
    newEmail: "services.demo@zionapos.com",
    slug: "demo-services",
    name: "Managing Consultant & Principal",
    phone: "+91 98765 00006",
  },
];

async function main() {
  console.log("🔄 Updating 6 Tenant user emails from @smartvyapar.app to @zionapos.com...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, salt);

  for (const item of EMAIL_MAPPINGS) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: item.slug },
    });

    if (!tenant) {
      console.warn(`Tenant not found for slug ${item.slug}`);
      continue;
    }

    // Update tenant contact email
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { email: item.newEmail },
    });

    // Check if old email exists
    const oldUser = await prisma.user.findUnique({
      where: { email: item.oldEmail },
    });

    if (oldUser) {
      await prisma.user.update({
        where: { id: oldUser.id },
        data: {
          email: item.newEmail,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`Updated user ${item.oldEmail} -> ${item.newEmail}`);
    } else {
      // Upsert new email
      await prisma.user.upsert({
        where: { email: item.newEmail },
        update: {
          passwordHash,
          isActive: true,
        },
        create: {
          tenantId: tenant.id,
          name: item.name,
          email: item.newEmail,
          phone: item.phone,
          role: UserRole.OWNER,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`Created/Ensured user ${item.newEmail}`);
    }
  }

  console.log("✅ All 6 demo tenant users updated to @zionapos.com successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
