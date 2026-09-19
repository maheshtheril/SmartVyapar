const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error("No tenant found in DB!");
    return;
  }
  console.log("Found tenant:", tenant.id, tenant.businessName, tenant.slug);

  const reviewerHash = await bcrypt.hash("Razorpay@2026", 10);
  const userHash = await bcrypt.hash("SmartVyapar@2026", 10);

  // 1. Reviewer account for Razorpay audit team
  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@razorpay.com" },
    update: {
      passwordHash: reviewerHash,
      isActive: true,
      role: "OWNER",
    },
    create: {
      tenantId: tenant.id,
      name: "Razorpay Compliance Reviewer",
      email: "reviewer@razorpay.com",
      phone: "+919999999999",
      passwordHash: reviewerHash,
      role: "OWNER",
      isActive: true,
    },
  });
  console.log("✅ Upserted reviewer account:", reviewer.email);

  // 2. Mahesh's primary email
  const maheshUser = await prisma.user.upsert({
    where: { email: "maheshtheril25@gmail.com" },
    update: {
      passwordHash: userHash,
      isActive: true,
      role: "OWNER",
    },
    create: {
      tenantId: tenant.id,
      name: "Mahesh Theril",
      email: "maheshtheril25@gmail.com",
      phone: "+916238539510",
      passwordHash: userHash,
      role: "OWNER",
      isActive: true,
    },
  });
  console.log("✅ Upserted Mahesh account:", maheshUser.email);

  // 3. Demo merchant account
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@smartvyapar.app" },
    update: {
      passwordHash: userHash,
      isActive: true,
      role: "OWNER",
    },
    create: {
      tenantId: tenant.id,
      name: "Demo Merchant",
      email: "demo@smartvyapar.app",
      phone: "+919876543210",
      passwordHash: userHash,
      role: "OWNER",
      isActive: true,
    },
  });
  console.log("✅ Upserted Demo account:", demoUser.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
