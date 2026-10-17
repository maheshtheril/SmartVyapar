import { PrismaClient, UserRole, SubscriptionTier } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
});

const SHARED_PASSWORD = "ZionaPOS@2026";

import { seedDefaultAccounts } from "../src/lib/default-accounts";

async function ensureWarehouseAndAccounts(tenantId: string) {
  // 1. Warehouse
  let wh = await prisma.warehouse.findFirst({
    where: { tenantId, isDefault: true },
  });
  if (!wh) {
    wh = await prisma.warehouse.create({
      data: {
        tenantId,
        name: "Main Central Store",
        code: "WH-MAIN",
        city: "Kochi",
        address: "Primary Store Location",
        isDefault: true,
      },
    });
  }

  // 2. Default Chart of Accounts
  await seedDefaultAccounts(prisma, tenantId);
}

async function main() {
  console.log("🚀 Starting Seed for 3 New Industry Tenants (Apparel, Electronics, Salon)...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, salt);

  // =========================================================================
  // 1. TEXTILES & APPAREL
  // =========================================================================
  console.log("Creating/Updating 1. Apparel Tenant...");
  const apparelTenant = await prisma.tenant.upsert({
    where: { slug: "demo-apparel" },
    update: {
      businessName: "Vogue & Velvet Textiles & Apparel",
      legalName: "Vogue & Velvet Apparel Retail LLP",
      businessType: "APPAREL",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCV9988A1Z9",
      phone: "+91 98765 00007",
      email: "apparel.demo@zionapos.com",
      upiId: "vogueapparel@okaxis",
      address: "Marine Drive, Fashion Boulevard, Ernakulam, Kerala",
      pincode: "682011",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-apparel",
      businessName: "Vogue & Velvet Textiles & Apparel",
      legalName: "Vogue & Velvet Apparel Retail LLP",
      businessType: "APPAREL",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCV9988A1Z9",
      phone: "+91 98765 00007",
      email: "apparel.demo@zionapos.com",
      upiId: "vogueapparel@okaxis",
      address: "Marine Drive, Fashion Boulevard, Ernakulam, Kerala",
      pincode: "682011",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  await prisma.user.upsert({
    where: { email: "apparel.demo@zionapos.com" },
    update: {
      tenantId: apparelTenant.id,
      name: "Fashion Store Director",
      phone: "+91 98765 00007",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: apparelTenant.id,
      name: "Fashion Store Director",
      email: "apparel.demo@zionapos.com",
      phone: "+91 98765 00007",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  await ensureWarehouseAndAccounts(apparelTenant.id);

  const apparelProducts = [
    {
      name: "Raymond Premium Slim Fit Cotton Shirt (Sky Blue / 40)",
      barcode: "890200100101",
      sku: "APP-SHIRT-BLU-40",
      hsnCode: "620520",
      category: "Formal Shirts",
      brand: "Raymond",
      baseUnit: "PCS",
      purchasePrice: 850,
      sellingPrice: 1499,
      mrp: 1699,
      gstRate: 12,
      currentStock: 45,
      minStockAlert: 8,
    },
    {
      name: "Levi's 511 Slim Fit Stretch Denim (Dark Indigo / 32)",
      barcode: "890200100102",
      sku: "APP-JEAN-IND-32",
      hsnCode: "620342",
      category: "Denim",
      brand: "Levi's",
      baseUnit: "PCS",
      purchasePrice: 1450,
      sellingPrice: 2499,
      mrp: 2799,
      gstRate: 12,
      currentStock: 30,
      minStockAlert: 5,
    },
    {
      name: "Pure Kanchipuram Bridal Silk Saree (Crimson Zari)",
      barcode: "890200100103",
      sku: "APP-SARI-KAN-01",
      hsnCode: "500720",
      category: "Ethnic Wear",
      brand: "Heritage Silk",
      baseUnit: "PCS",
      purchasePrice: 4200,
      sellingPrice: 6500,
      mrp: 7500,
      gstRate: 5,
      currentStock: 18,
      minStockAlert: 3,
    },
    {
      name: "Pure Irish Linen Suiting Fabric (Unstitched)",
      barcode: "890200100104",
      sku: "APP-FAB-LIN-MTR",
      hsnCode: "530919",
      category: "Fabrics & Suitings",
      brand: "Linen Club",
      baseUnit: "MTR",
      purchasePrice: 520,
      sellingPrice: 850,
      mrp: 950,
      gstRate: 5,
      currentStock: 150,
      minStockAlert: 20,
    },
  ];

  for (const p of apparelProducts) {
    const existing = await prisma.product.findFirst({
      where: { tenantId: apparelTenant.id, sku: p.sku },
    });
    if (!existing) {
      await prisma.product.create({
        data: { tenantId: apparelTenant.id, ...p },
      });
    }
  }

  // =========================================================================
  // 2. ELECTRONICS & MOBILES
  // =========================================================================
  console.log("Creating/Updating 2. Electronics Tenant...");
  const elecTenant = await prisma.tenant.upsert({
    where: { slug: "demo-electronics" },
    update: {
      businessName: "ElectroPulse Digital & Mobiles",
      legalName: "ElectroPulse Retail India Pvt Ltd",
      businessType: "ELECTRONICS",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCE4455C1Z7",
      phone: "+91 98765 00008",
      email: "electronics.demo@zionapos.com",
      upiId: "electropulse@okaxis",
      address: "Penta Menaka Complex, Shanmugham Road, Kochi, Kerala",
      pincode: "682031",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-electronics",
      businessName: "ElectroPulse Digital & Mobiles",
      legalName: "ElectroPulse Retail India Pvt Ltd",
      businessType: "ELECTRONICS",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCE4455C1Z7",
      phone: "+91 98765 00008",
      email: "electronics.demo@zionapos.com",
      upiId: "electropulse@okaxis",
      address: "Penta Menaka Complex, Shanmugham Road, Kochi, Kerala",
      pincode: "682031",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  await prisma.user.upsert({
    where: { email: "electronics.demo@zionapos.com" },
    update: {
      tenantId: elecTenant.id,
      name: "Gadget Store Manager",
      phone: "+91 98765 00008",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: elecTenant.id,
      name: "Gadget Store Manager",
      email: "electronics.demo@zionapos.com",
      phone: "+91 98765 00008",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  await ensureWarehouseAndAccounts(elecTenant.id);

  const elecProducts = [
    {
      name: "Apple iPhone 16 Pro 128GB (Natural Titanium)",
      barcode: "195949000101",
      sku: "ELEC-IPH16P-128",
      hsnCode: "851713",
      category: "Smartphones",
      brand: "Apple",
      baseUnit: "PCS",
      purchasePrice: 104000,
      sellingPrice: 119900,
      mrp: 119900,
      gstRate: 18,
      currentStock: 12,
      minStockAlert: 2,
      hasSerialTracking: true,
    },
    {
      name: "Samsung Galaxy S24 Ultra 5G 256GB (Titanium Gray)",
      barcode: "880609500102",
      sku: "ELEC-S24U-256",
      hsnCode: "851713",
      category: "Smartphones",
      brand: "Samsung",
      baseUnit: "PCS",
      purchasePrice: 112000,
      sellingPrice: 129999,
      mrp: 134999,
      gstRate: 18,
      currentStock: 10,
      minStockAlert: 2,
      hasSerialTracking: true,
    },
    {
      name: "Sony WH-1000XM5 Wireless Noise Canceling Headphones",
      barcode: "454873600103",
      sku: "ELEC-SONY-XM5",
      hsnCode: "851830",
      category: "Audio",
      brand: "Sony",
      baseUnit: "PCS",
      purchasePrice: 22500,
      sellingPrice: 28990,
      mrp: 34990,
      gstRate: 18,
      currentStock: 15,
      minStockAlert: 3,
    },
    {
      name: "Dell Inspiron 15 Core i5 16GB / 512GB SSD FHD",
      barcode: "884116000104",
      sku: "ELEC-DELL-I15",
      hsnCode: "847130",
      category: "Laptops",
      brand: "Dell",
      baseUnit: "PCS",
      purchasePrice: 47500,
      sellingPrice: 56990,
      mrp: 62000,
      gstRate: 18,
      currentStock: 8,
      minStockAlert: 2,
    },
  ];

  for (const p of elecProducts) {
    const existing = await prisma.product.findFirst({
      where: { tenantId: elecTenant.id, sku: p.sku },
    });
    if (!existing) {
      await prisma.product.create({
        data: { tenantId: elecTenant.id, ...p },
      });
    }
  }

  // =========================================================================
  // 3. SALON, SPA & WELLNESS
  // =========================================================================
  console.log("Creating/Updating 3. Salon & Spa Tenant...");
  const salonTenant = await prisma.tenant.upsert({
    where: { slug: "demo-salon" },
    update: {
      businessName: "Aura Luxury Salon, Spa & Wellness",
      legalName: "Aura Wellness & Aesthetic Services LLP",
      businessType: "SALON_SPA",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCA7788B1Z2",
      phone: "+91 98765 00009",
      email: "salon.demo@zionapos.com",
      upiId: "aurasalon@okaxis",
      address: "Plaza Tower, Convent Road, Cochin, Kerala",
      pincode: "682035",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-salon",
      businessName: "Aura Luxury Salon, Spa & Wellness",
      legalName: "Aura Wellness & Aesthetic Services LLP",
      businessType: "SALON_SPA",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCA7788B1Z2",
      phone: "+91 98765 00009",
      email: "salon.demo@zionapos.com",
      upiId: "aurasalon@okaxis",
      address: "Plaza Tower, Convent Road, Cochin, Kerala",
      pincode: "682035",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  await prisma.user.upsert({
    where: { email: "salon.demo@zionapos.com" },
    update: {
      tenantId: salonTenant.id,
      name: "Salon Creative Director",
      phone: "+91 98765 00009",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: salonTenant.id,
      name: "Salon Creative Director",
      email: "salon.demo@zionapos.com",
      phone: "+91 98765 00009",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  await ensureWarehouseAndAccounts(salonTenant.id);

  const salonServices = [
    {
      name: "Signature Haircut & Beard Styling (Director Stylist)",
      sku: "SALON-CUT-DIR",
      hsnCode: "999721",
      category: "Hair Styling",
      baseUnit: "SERVICE",
      purchasePrice: 0,
      sellingPrice: 650,
      mrp: 700,
      gstRate: 18,
      currentStock: 999,
    },
    {
      name: "L'Oreal Professional Keratin Hair Spa Treatment",
      sku: "SALON-SPA-KER",
      hsnCode: "999721",
      category: "Hair Treatments",
      baseUnit: "SERVICE",
      purchasePrice: 450,
      sellingPrice: 1800,
      mrp: 2200,
      gstRate: 18,
      currentStock: 999,
    },
    {
      name: "Bridal Radiance Hydra-Facial Therapy (90 mins)",
      sku: "SALON-FAC-HYD",
      hsnCode: "999722",
      category: "Skin & Spa",
      baseUnit: "SERVICE",
      purchasePrice: 600,
      sellingPrice: 3200,
      mrp: 3800,
      gstRate: 18,
      currentStock: 999,
    },
    {
      name: "Moroccanoil Treatment Original 100ml (Retail)",
      barcode: "729001150105",
      sku: "SALON-OIL-100",
      hsnCode: "330590",
      category: "Retail Products",
      baseUnit: "PCS",
      purchasePrice: 2400,
      sellingPrice: 3150,
      mrp: 3300,
      gstRate: 18,
      currentStock: 25,
      minStockAlert: 5,
    },
  ];

  for (const s of salonServices) {
    const existing = await prisma.product.findFirst({
      where: { tenantId: salonTenant.id, sku: s.sku },
    });
    if (!existing) {
      await prisma.product.create({
        data: { tenantId: salonTenant.id, ...s },
      });
    }
  }

  console.log("✅ Successfully seeded all 3 new industry tenants!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding new industries:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
