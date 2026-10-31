import { prisma } from "../src/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const SHARED_PASSWORD = "ZionaPOS@2026";

interface DemoAccountConfig {
  slug: string;
  prefix: string; // e.g. "lab.demo"
  name: string;
  phone: string;
  tenantEmail: string;
}

const DEMO_TENANTS: DemoAccountConfig[] = [
  {
    slug: "demo-retail",
    prefix: "retail.demo",
    name: "Bazaar Store Manager",
    phone: "+91 98765 00001",
    tenantEmail: "retail.demo@zaayasoft.com",
  },
  {
    slug: "demo-restaurant",
    prefix: "restaurant.demo",
    name: "Chef Executive / General Manager",
    phone: "+91 98765 00002",
    tenantEmail: "restaurant.demo@zaayasoft.com",
  },
  {
    slug: "demo-garage",
    prefix: "garage.demo",
    name: "Workshop Service Manager",
    phone: "+91 98765 00003",
    tenantEmail: "garage.demo@zaayasoft.com",
  },
  {
    slug: "demo-distribution",
    prefix: "distribution.demo",
    name: "Distribution Operations Head",
    phone: "+91 98765 00004",
    tenantEmail: "distribution.demo@zaayasoft.com",
  },
  {
    slug: "demo-pharma",
    prefix: "pharma.demo",
    name: "Chief Pharmacist & Compliance Officer",
    phone: "+91 98765 00005",
    tenantEmail: "pharma.demo@zaayasoft.com",
  },
  {
    slug: "demo-services",
    prefix: "services.demo",
    name: "Managing Consultant & Principal",
    phone: "+91 98765 00006",
    tenantEmail: "services.demo@zaayasoft.com",
  },
  {
    slug: "demo-apparel",
    prefix: "apparel.demo",
    name: "Fashion Store Director",
    phone: "+91 98765 00007",
    tenantEmail: "apparel.demo@zaayasoft.com",
  },
  {
    slug: "demo-electronics",
    prefix: "electronics.demo",
    name: "Gadget Store Manager",
    phone: "+91 98765 00008",
    tenantEmail: "electronics.demo@zaayasoft.com",
  },
  {
    slug: "demo-salon",
    prefix: "salon.demo",
    name: "Salon Creative Director",
    phone: "+91 98765 00009",
    tenantEmail: "salon.demo@zaayasoft.com",
  },
  {
    slug: "demo-lab",
    prefix: "lab.demo",
    name: "Dr. Ananya Nair (Chief Pathologist)",
    phone: "+91 98765 00010",
    tenantEmail: "lab.demo@zaayasoft.com",
  },
];

async function main() {
  console.log("🔄 Synchronizing all 10 demo accounts with @zaayasoft.com and @zionapos.store...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, salt);

  for (const t of DEMO_TENANTS) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: t.slug },
    });

    if (!tenant) {
      console.warn(`Tenant not found for slug: ${t.slug}`);
      continue;
    }

    // Update tenant contact email to zaayasoft.com
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { email: t.tenantEmail },
    });

    // We will ensure user accounts for:
    // 1. ${t.prefix}@zaayasoft.com (Official company mail domain)
    // 2. ${t.prefix}@zionapos.store (App site domain)
    // 3. ${t.prefix}@zionapos.com (Legacy fallback)
    const emailVariants = [
      `${t.prefix}@zaayasoft.com`,
      `${t.prefix}@zionapos.store`,
      `${t.prefix}@zionapos.com`,
    ];

    for (const email of emailVariants) {
      await prisma.user.upsert({
        where: { email },
        update: {
          tenantId: tenant.id,
          passwordHash,
          isActive: true,
          role: UserRole.OWNER,
        },
        create: {
          tenantId: tenant.id,
          name: t.name,
          email,
          phone: t.phone,
          role: UserRole.OWNER,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✓ Ensured user: ${email} -> ${tenant.businessName}`);
    }
  }

  // Also ensure lab technologist
  const labTenant = await prisma.tenant.findUnique({ where: { slug: "demo-lab" } });
  if (labTenant) {
    for (const email of ["lab.tech@zaayasoft.com", "lab.tech@zionapos.store", "lab.tech@zionapos.com"]) {
      await prisma.user.upsert({
        where: { email },
        update: {
          tenantId: labTenant.id,
          passwordHash,
          isActive: true,
          role: UserRole.STAFF,
        },
        create: {
          tenantId: labTenant.id,
          name: "Rahul Kumar (Senior Technologist)",
          email,
          phone: "+91 98765 00011",
          role: UserRole.STAFF,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✓ Ensured user: ${email} -> Staff for Apex Diagnostics`);
    }
  }

  console.log("🎉 All 10 demo vertical credentials successfully synchronized!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
