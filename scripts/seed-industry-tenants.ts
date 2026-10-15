import { PrismaClient, UserRole, SubscriptionTier, ProductType, TableStatus, JobCardStatus, JobCardItemType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SHARED_PASSWORD = "ZionaPOS@2026";

async function main() {
  console.log("🚀 Starting 6 Industry Tenant Seed Script...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, salt);

  // =========================================================================
  // 1. RETAIL / SUPERMARKET TENANT
  // =========================================================================
  console.log("Creating/Updating 1. RETAIL Tenant...");
  const retailTenant = await prisma.tenant.upsert({
    where: { slug: "demo-retail" },
    update: {
      businessName: "SmartBazaar Retail Supermarket",
      legalName: "SmartBazaar Retail LLP",
      businessType: "RETAIL",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429B1Z1",
      phone: "+91 98765 00001",
      email: "retail.demo@smartvyapar.app",
      upiId: "smartbazaar@okaxis",
      address: "MG Road, Central Junction, Ernakulam, Kerala",
      pincode: "682035",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-retail",
      businessName: "SmartBazaar Retail Supermarket",
      legalName: "SmartBazaar Retail LLP",
      businessType: "RETAIL",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429B1Z1",
      phone: "+91 98765 00001",
      email: "retail.demo@smartvyapar.app",
      upiId: "smartbazaar@okaxis",
      address: "MG Road, Central Junction, Ernakulam, Kerala",
      pincode: "682035",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  const retailUser = await prisma.user.upsert({
    where: { email: "retail.demo@smartvyapar.app" },
    update: {
      tenantId: retailTenant.id,
      name: "Bazaar Store Manager",
      phone: "+91 98765 00001",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: retailTenant.id,
      name: "Bazaar Store Manager",
      email: "retail.demo@smartvyapar.app",
      phone: "+91 98765 00001",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  // Sample Retail Products
  const retailProducts = [
    {
      name: "Basmati Premium Rice 5kg",
      barcode: "890103000001",
      sku: "GROC-RICE-5K",
      hsnCode: "10063020",
      category: "Groceries",
      baseUnit: "BAG",
      purchasePrice: 350,
      sellingPrice: 420,
      mrp: 450,
      gstRate: 5,
      currentStock: 100,
      minStockAlert: 10,
    },
    {
      name: "Farm Fresh Cow Milk 1L",
      barcode: "890103000002",
      sku: "DAIRY-MILK-1L",
      hsnCode: "04012000",
      category: "Dairy",
      baseUnit: "PKT",
      purchasePrice: 48,
      sellingPrice: 54,
      mrp: 56,
      gstRate: 0,
      currentStock: 50,
      minStockAlert: 10,
    },
    {
      name: "Organic Green Tea 100g",
      barcode: "890103000003",
      sku: "BEV-TEA-100G",
      hsnCode: "09021020",
      category: "Beverages",
      baseUnit: "BOX",
      purchasePrice: 120,
      sellingPrice: 165,
      mrp: 180,
      gstRate: 5,
      currentStock: 75,
      minStockAlert: 15,
    },
    {
      name: "Sparkling Apple Juice 500ml",
      barcode: "890103000004",
      sku: "BEV-JUICE-500",
      hsnCode: "22029920",
      category: "Beverages",
      baseUnit: "BOT",
      purchasePrice: 45,
      sellingPrice: 65,
      mrp: 70,
      gstRate: 12,
      currentStock: 120,
      minStockAlert: 20,
    },
  ];

  for (const p of retailProducts) {
    const existing = await prisma.product.findFirst({
      where: { tenantId: retailTenant.id, barcode: p.barcode },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          tenantId: retailTenant.id,
          name: p.name,
          barcode: p.barcode,
          sku: p.sku,
          hsnCode: p.hsnCode,
          category: p.category,
          baseUnit: p.baseUnit,
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          mrp: p.mrp,
          gstRate: p.gstRate,
          currentStock: p.currentStock,
          minStockAlert: p.minStockAlert,
          productType: ProductType.RETAIL_ITEM,
        },
      });
    }
  }

  // =========================================================================
  // 2. RESTAURANT TENANT
  // =========================================================================
  console.log("Creating/Updating 2. RESTAURANT Tenant...");
  const restaurantTenant = await prisma.tenant.upsert({
    where: { slug: "demo-restaurant" },
    update: {
      businessName: "The Spice Route Kitchen & Cafe",
      legalName: "Spice Route Hospitality Pvt Ltd",
      businessType: "RESTAURANT",
      restaurantPlan: "PRO",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429R1Z2",
      phone: "+91 98765 00002",
      email: "restaurant.demo@smartvyapar.app",
      upiId: "spiceroute@okaxis",
      address: "Marine Drive Promenade, Kochi, Kerala",
      pincode: "682011",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-restaurant",
      businessName: "The Spice Route Kitchen & Cafe",
      legalName: "Spice Route Hospitality Pvt Ltd",
      businessType: "RESTAURANT",
      restaurantPlan: "PRO",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429R1Z2",
      phone: "+91 98765 00002",
      email: "restaurant.demo@smartvyapar.app",
      upiId: "spiceroute@okaxis",
      address: "Marine Drive Promenade, Kochi, Kerala",
      pincode: "682011",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  const restaurantUser = await prisma.user.upsert({
    where: { email: "restaurant.demo@smartvyapar.app" },
    update: {
      tenantId: restaurantTenant.id,
      name: "Chef Executive / General Manager",
      phone: "+91 98765 00002",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: restaurantTenant.id,
      name: "Chef Executive / General Manager",
      email: "restaurant.demo@smartvyapar.app",
      phone: "+91 98765 00002",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  // Dining Tables
  const tables = [
    { name: "T-01", section: "Main Hall", capacity: 4 },
    { name: "T-02", section: "Main Hall", capacity: 4 },
    { name: "T-03", section: "Main Hall", capacity: 2 },
    { name: "AC-1", section: "AC Dining", capacity: 6 },
    { name: "AC-2", section: "AC Dining", capacity: 4 },
    { name: "RT-1", section: "Rooftop Garden", capacity: 4 },
    { name: "Parcel-01", section: "Takeaway Counter", capacity: 1 },
  ];

  for (const t of tables) {
    await prisma.restaurantTable.upsert({
      where: {
        tenantId_name: {
          tenantId: restaurantTenant.id,
          name: t.name,
        },
      },
      update: {
        section: t.section,
        capacity: t.capacity,
        status: TableStatus.VACANT,
      },
      create: {
        tenantId: restaurantTenant.id,
        name: t.name,
        section: t.section,
        capacity: t.capacity,
        status: TableStatus.VACANT,
      },
    });
  }

  // Restaurant Raw Materials & Finished Dishes
  let rawChicken = await prisma.product.findFirst({
    where: { tenantId: restaurantTenant.id, sku: "RAW-CHICKEN-KG" },
  });
  if (!rawChicken) {
    rawChicken = await prisma.product.create({
      data: {
        tenantId: restaurantTenant.id,
        name: "Fresh Broiler Chicken (Raw)",
        sku: "RAW-CHICKEN-KG",
        hsnCode: "02071200",
        category: "Raw Meat",
        baseUnit: "KG",
        productType: ProductType.RAW_MATERIAL,
        purchasePrice: 180,
        sellingPrice: 180,
        gstRate: 0,
        currentStock: 50,
      },
    });
  }

  let biryaniRice = await prisma.product.findFirst({
    where: { tenantId: restaurantTenant.id, sku: "RAW-RICE-KG" },
  });
  if (!biryaniRice) {
    biryaniRice = await prisma.product.create({
      data: {
        tenantId: restaurantTenant.id,
        name: "Aged Basmati Biryani Rice (Raw)",
        sku: "RAW-RICE-KG",
        hsnCode: "10063020",
        category: "Grains",
        baseUnit: "KG",
        productType: ProductType.RAW_MATERIAL,
        purchasePrice: 90,
        sellingPrice: 90,
        gstRate: 5,
        currentStock: 80,
      },
    });
  }

  let biryaniDish = await prisma.product.findFirst({
    where: { tenantId: restaurantTenant.id, sku: "DISH-BIRYANI-SPL" },
  });
  if (!biryaniDish) {
    biryaniDish = await prisma.product.create({
      data: {
        tenantId: restaurantTenant.id,
        name: "Special Malabar Dum Biryani",
        sku: "DISH-BIRYANI-SPL",
        hsnCode: "21069099",
        category: "Main Course",
        baseUnit: "PORTION",
        productType: ProductType.FINISHED_GOOD,
        purchasePrice: 95,
        sellingPrice: 260,
        mrp: 260,
        gstRate: 5,
        currentStock: 25,
      },
    });

    // Create Recipe Item BOM
    await prisma.recipeItem.createMany({
      data: [
        {
          tenantId: restaurantTenant.id,
          menuProductId: biryaniDish.id,
          ingredientId: rawChicken.id,
          quantityRequired: 0.25, // 250g chicken per plate
        },
        {
          tenantId: restaurantTenant.id,
          menuProductId: biryaniDish.id,
          ingredientId: biryaniRice.id,
          quantityRequired: 0.2, // 200g rice per plate
        },
      ],
    });
  }

  // Additional Menu Items
  const otherMenuItems = [
    { name: "Chicken 65 Crispy", sku: "DISH-CHICKEN-65", category: "Starters", price: 220, hsn: "21069099" },
    { name: "Fresh Mint Lime Cooler", sku: "DISH-MINT-LIME", category: "Beverages", price: 80, hsn: "22029990" },
    { name: "Kerala Flaky Parotta (3 Pcs)", sku: "DISH-PAROTTA-3", category: "Breads", price: 60, hsn: "19059090" },
  ];
  for (const item of otherMenuItems) {
    const exists = await prisma.product.findFirst({
      where: { tenantId: restaurantTenant.id, sku: item.sku },
    });
    if (!exists) {
      await prisma.product.create({
        data: {
          tenantId: restaurantTenant.id,
          name: item.name,
          sku: item.sku,
          hsnCode: item.hsn,
          category: item.category,
          baseUnit: "PORTION",
          productType: ProductType.FINISHED_GOOD,
          purchasePrice: item.price * 0.4,
          sellingPrice: item.price,
          mrp: item.price,
          gstRate: 5,
          currentStock: 50,
        },
      });
    }
  }

  // =========================================================================
  // 3. AUTOMOBILE WORKSHOP & GARAGE TENANT
  // =========================================================================
  console.log("Creating/Updating 3. AUTOMOBILE Tenant...");
  const garageTenant = await prisma.tenant.upsert({
    where: { slug: "demo-garage" },
    update: {
      businessName: "Apex Pro Motors & Garage",
      legalName: "Apex Pro Automotive Care LLP",
      businessType: "AUTOMOBILE",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429A1Z3",
      phone: "+91 98765 00003",
      email: "garage.demo@smartvyapar.app",
      upiId: "apexgarage@okaxis",
      address: "NH-66 Bypass, Auto Hub, Edappally, Kochi",
      pincode: "682024",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-garage",
      businessName: "Apex Pro Motors & Garage",
      legalName: "Apex Pro Automotive Care LLP",
      businessType: "AUTOMOBILE",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429A1Z3",
      phone: "+91 98765 00003",
      email: "garage.demo@smartvyapar.app",
      upiId: "apexgarage@okaxis",
      address: "NH-66 Bypass, Auto Hub, Edappally, Kochi",
      pincode: "682024",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  const garageUser = await prisma.user.upsert({
    where: { email: "garage.demo@smartvyapar.app" },
    update: {
      tenantId: garageTenant.id,
      name: "Workshop Service Manager",
      phone: "+91 98765 00003",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: garageTenant.id,
      name: "Workshop Service Manager",
      email: "garage.demo@smartvyapar.app",
      phone: "+91 98765 00003",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  // Labour Services
  const labourServices = [
    { name: "Full Periodic Service Labour", sacCode: "998714", fixedRate: 1800, gstRate: 18 },
    { name: "Front Brake Overhaul & Pad Replacement", sacCode: "998714", fixedRate: 850, gstRate: 18 },
    { name: "3D Wheel Alignment & High-Speed Balancing", sacCode: "998714", fixedRate: 650, gstRate: 18 },
  ];

  for (const ls of labourServices) {
    const exists = await prisma.labourService.findFirst({
      where: { tenantId: garageTenant.id, name: ls.name },
    });
    if (!exists) {
      await prisma.labourService.create({
        data: {
          tenantId: garageTenant.id,
          name: ls.name,
          sacCode: ls.sacCode,
          fixedRate: ls.fixedRate,
          gstRate: ls.gstRate,
        },
      });
    }
  }

  // Spare Parts Products
  const spareParts = [
    {
      name: "Fully Synthetic Engine Oil 5W-40 4L",
      partNumber: "SYN-5W40-4L",
      brand: "Mobil 1",
      hsnCode: "27101981",
      purchasePrice: 2100,
      sellingPrice: 2800,
      mrp: 3200,
      gstRate: 18,
      currentStock: 25,
    },
    {
      name: "Ceramic Front Brake Pad Set (Creta/Seltos)",
      partNumber: "BP-CR-889",
      brand: "Brembo / Bosch",
      hsnCode: "87083000",
      purchasePrice: 1200,
      sellingPrice: 1750,
      mrp: 1950,
      gstRate: 18,
      currentStock: 15,
    },
    {
      name: "High Efficiency Engine Oil Filter",
      partNumber: "OF-HY-202",
      brand: "Hyundai Genuine",
      hsnCode: "84212300",
      purchasePrice: 220,
      sellingPrice: 380,
      mrp: 420,
      gstRate: 18,
      currentStock: 40,
    },
  ];

  for (const sp of spareParts) {
    const exists = await prisma.product.findFirst({
      where: { tenantId: garageTenant.id, partNumber: sp.partNumber },
    });
    if (!exists) {
      await prisma.product.create({
        data: {
          tenantId: garageTenant.id,
          name: sp.name,
          partNumber: sp.partNumber,
          brand: sp.brand,
          hsnCode: sp.hsnCode,
          category: "Auto Spares",
          baseUnit: "PCS",
          purchasePrice: sp.purchasePrice,
          sellingPrice: sp.sellingPrice,
          mrp: sp.mrp,
          gstRate: sp.gstRate,
          currentStock: sp.currentStock,
        },
      });
    }
  }

  // Sample Customer, Vehicle & Active Job Card
  let garageCustomer = await prisma.customer.findFirst({
    where: { tenantId: garageTenant.id, phone: "+91 94471 23456" },
  });
  if (!garageCustomer) {
    garageCustomer = await prisma.customer.create({
      data: {
        tenantId: garageTenant.id,
        name: "Rahul Menon",
        phone: "+91 94471 23456",
        address: "Panampilly Nagar, Kochi",
      },
    });
  }

  let vehicle = await prisma.customerVehicle.findFirst({
    where: { tenantId: garageTenant.id, licensePlate: "KL-07-CB-5544" },
  });
  if (!vehicle) {
    vehicle = await prisma.customerVehicle.create({
      data: {
        tenantId: garageTenant.id,
        customerId: garageCustomer.id,
        licensePlate: "KL-07-CB-5544",
        make: "Hyundai",
        model: "Creta 1.5 CRDi",
        year: 2022,
        color: "Phantom Black",
        fuelType: "Diesel",
        transmission: "Manual",
        lastServiceKm: 28500,
      },
    });
  }

  const existingJobCard = await prisma.jobCard.findFirst({
    where: { tenantId: garageTenant.id, jobCardNumber: "JC-2026-0001" },
  });
  if (!existingJobCard) {
    await prisma.jobCard.create({
      data: {
        tenantId: garageTenant.id,
        jobCardNumber: "JC-2026-0001",
        vehicleId: vehicle.id,
        customerId: garageCustomer.id,
        status: JobCardStatus.IN_PROGRESS,
        odometerReading: 30120,
        customerConcerns: "Slight squeaking sound during braking + 30,000 KM periodic service inspection.",
        mechanicNotes: "Brake pads inspected; 3mm friction material left. Advised replacement with rotor skimming.",
        assignedMechanic: "Manoj Kumar",
        estimatedTotal: 4930,
      },
    });
  }

  // =========================================================================
  // 4. FMCG & WHOLESALE DISTRIBUTION TENANT
  // =========================================================================
  console.log("Creating/Updating 4. DISTRIBUTION Tenant...");
  const distTenant = await prisma.tenant.upsert({
    where: { slug: "demo-distribution" },
    update: {
      businessName: "Horizon FMCG & Wholesale Distributors",
      legalName: "Horizon Supply Chain Distribution India Pvt Ltd",
      businessType: "DISTRIBUTION",
      enableTerritory: true,
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429D1Z4",
      phone: "+91 98765 00004",
      email: "distribution.demo@smartvyapar.app",
      upiId: "horizondist@okaxis",
      address: "Distribution Central Depot, Kalamassery Industrial Estate, Kochi",
      pincode: "682033",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-distribution",
      businessName: "Horizon FMCG & Wholesale Distributors",
      legalName: "Horizon Supply Chain Distribution India Pvt Ltd",
      businessType: "DISTRIBUTION",
      enableTerritory: true,
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429D1Z4",
      phone: "+91 98765 00004",
      email: "distribution.demo@smartvyapar.app",
      upiId: "horizondist@okaxis",
      address: "Distribution Central Depot, Kalamassery Industrial Estate, Kochi",
      pincode: "682033",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  const distUser = await prisma.user.upsert({
    where: { email: "distribution.demo@smartvyapar.app" },
    update: {
      tenantId: distTenant.id,
      name: "Distribution Operations Head",
      phone: "+91 98765 00004",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: distTenant.id,
      name: "Distribution Operations Head",
      email: "distribution.demo@smartvyapar.app",
      phone: "+91 98765 00004",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  // Multi-Warehouses
  const warehouses = [
    { name: "Central Master Godown", code: "WH-CENTRAL", isDefault: true, city: "Kochi" },
    { name: "North District Depot", code: "WH-NORTH", isDefault: false, city: "Aluva" },
    { name: "Mobile Van Sales Unit 1", code: "VAN-01", isDefault: false, city: "Kochi Beat" },
  ];
  for (const wh of warehouses) {
    await prisma.warehouse.upsert({
      where: {
        tenantId_code: {
          tenantId: distTenant.id,
          code: wh.code,
        },
      },
      update: {
        name: wh.name,
        isDefault: wh.isDefault,
        city: wh.city,
      },
      create: {
        tenantId: distTenant.id,
        name: wh.name,
        code: wh.code,
        isDefault: wh.isDefault,
        city: wh.city,
      },
    });
  }

  // Price List
  const wholesalePriceList = await prisma.priceList.upsert({
    where: { id: "demo-pl-wholesale" },
    update: {
      tenantId: distTenant.id,
      name: "Super Stockist Tier 1",
      description: "15% wholesale volume concession for primary stockists",
      type: "PERCENTAGE_DISCOUNT",
      value: 15,
      isActive: true,
    },
    create: {
      id: "demo-pl-wholesale",
      tenantId: distTenant.id,
      name: "Super Stockist Tier 1",
      description: "15% wholesale volume concession for primary stockists",
      type: "PERCENTAGE_DISCOUNT",
      value: 15,
      isActive: true,
    },
  });

  // FMCG Dual-Pack Products
  const fmcgProducts = [
    {
      name: "Sunflower Pure Cooking Oil 1L",
      barcode: "890204000001",
      sku: "OIL-SUN-1L",
      hsnCode: "15121910",
      category: "Edible Oils",
      baseUnit: "PCS",
      hasAltUnit: true,
      altUnit: "BOX",
      conversionFactor: 12,
      purchasePrice: 125,
      purchasePricePerAlt: 1500,
      sellingPrice: 145,
      sellingPricePerAlt: 1740,
      mrp: 160,
      gstRate: 5,
      currentStock: 240,
    },
    {
      name: "Choco Crunch Biscuits Family Pack",
      barcode: "890204000002",
      sku: "BIS-CHOCO-PKT",
      hsnCode: "19053100",
      category: "Confectionery",
      baseUnit: "PCS",
      hasAltUnit: true,
      altUnit: "CTN",
      conversionFactor: 24,
      purchasePrice: 28,
      purchasePricePerAlt: 672,
      sellingPrice: 34,
      sellingPricePerAlt: 816,
      mrp: 40,
      gstRate: 18,
      currentStock: 360,
    },
  ];

  for (const fp of fmcgProducts) {
    const exists = await prisma.product.findFirst({
      where: { tenantId: distTenant.id, barcode: fp.barcode },
    });
    if (!exists) {
      await prisma.product.create({
        data: {
          tenantId: distTenant.id,
          name: fp.name,
          barcode: fp.barcode,
          sku: fp.sku,
          hsnCode: fp.hsnCode,
          category: fp.category,
          baseUnit: fp.baseUnit,
          hasAltUnit: fp.hasAltUnit,
          altUnit: fp.altUnit,
          conversionFactor: fp.conversionFactor,
          purchasePrice: fp.purchasePrice,
          purchasePricePerAlt: fp.purchasePricePerAlt,
          sellingPrice: fp.sellingPrice,
          sellingPricePerAlt: fp.sellingPricePerAlt,
          mrp: fp.mrp,
          gstRate: fp.gstRate,
          currentStock: fp.currentStock,
        },
      });
    }
  }

  // B2B Wholesale Customer with Credit Limit
  const distCustomer = await prisma.customer.findFirst({
    where: { tenantId: distTenant.id, phone: "+91 98950 11223" },
  });
  if (!distCustomer) {
    await prisma.customer.create({
      data: {
        tenantId: distTenant.id,
        name: "Arogya Super Bazaar Wholesale",
        phone: "+91 98950 11223",
        gstin: "32AAACA1234F1Z9",
        creditLimit: 150000,
        priceListId: wholesalePriceList.id,
        address: "Near Goods Shed, Cochin Harbor",
      },
    });
  }

  // =========================================================================
  // 5. PHARMACEUTICAL TENANT
  // =========================================================================
  console.log("Creating/Updating 5. PHARMACEUTICAL Tenant...");
  const pharmaTenant = await prisma.tenant.upsert({
    where: { slug: "demo-pharma" },
    update: {
      businessName: "CarePlus Pharmacy & Healthcare",
      legalName: "CarePlus Lifesciences Retail Ltd",
      businessType: "RETAIL",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429P1Z5",
      phone: "+91 98765 00005",
      email: "pharma.demo@smartvyapar.app",
      upiId: "carepluspharma@okaxis",
      address: "Hospital Road, Opposite General Hospital, Kochi",
      pincode: "682016",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-pharma",
      businessName: "CarePlus Pharmacy & Healthcare",
      legalName: "CarePlus Lifesciences Retail Ltd",
      businessType: "RETAIL",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429P1Z5",
      phone: "+91 98765 00005",
      email: "pharma.demo@smartvyapar.app",
      upiId: "carepluspharma@okaxis",
      address: "Hospital Road, Opposite General Hospital, Kochi",
      pincode: "682016",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  const pharmaUser = await prisma.user.upsert({
    where: { email: "pharma.demo@smartvyapar.app" },
    update: {
      tenantId: pharmaTenant.id,
      name: "Chief Pharmacist & Compliance Officer",
      phone: "+91 98765 00005",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: pharmaTenant.id,
      name: "Chief Pharmacist & Compliance Officer",
      email: "pharma.demo@smartvyapar.app",
      phone: "+91 98765 00005",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  // Pharma Product 1: Paracetamol 650mg
  let paracetamol = await prisma.product.findFirst({
    where: { tenantId: pharmaTenant.id, sku: "MED-PCM-650" },
  });
  if (!paracetamol) {
    paracetamol = await prisma.product.create({
      data: {
        tenantId: pharmaTenant.id,
        name: "Paracetamol 650mg Tablets",
        sku: "MED-PCM-650",
        hsnCode: "30049060",
        category: "Analgesics & Antipyretics",
        baseUnit: "TAB",
        hasAltUnit: true,
        altUnit: "STRIP",
        conversionFactor: 15, // 15 tabs per strip
        purchasePrice: 1.2,
        sellingPrice: 2.5,
        mrp: 2.5,
        gstRate: 12,
        hasBatchTracking: true,
        currentStock: 600,
      },
    });

    // Create Batches: One Fresh, One Near Expiry
    await prisma.batch.createMany({
      data: [
        {
          tenantId: pharmaTenant.id,
          productId: paracetamol.id,
          batchNumber: "PCM-2026-A1",
          mfgDate: new Date("2026-01-10"),
          expiryDate: new Date("2027-12-31"),
          costPrice: 1.2,
          sellingPrice: 2.5,
          mrp: 2.5,
          currentStock: 450,
          isActive: true,
        },
        {
          tenantId: pharmaTenant.id,
          productId: paracetamol.id,
          batchNumber: "PCM-2025-E8",
          mfgDate: new Date("2025-05-01"),
          expiryDate: new Date("2026-11-30"), // Near expiry alert
          costPrice: 1.1,
          sellingPrice: 2.3,
          mrp: 2.5,
          currentStock: 150,
          isActive: true,
        },
      ],
    });
  }

  // Pharma Product 2: Amoxicillin 625mg
  let amox = await prisma.product.findFirst({
    where: { tenantId: pharmaTenant.id, sku: "MED-AMX-625" },
  });
  if (!amox) {
    amox = await prisma.product.create({
      data: {
        tenantId: pharmaTenant.id,
        name: "Amoxicillin & Clavulanate 625mg",
        sku: "MED-AMX-625",
        hsnCode: "30041010",
        category: "Antibiotics",
        baseUnit: "TAB",
        hasAltUnit: true,
        altUnit: "STRIP",
        conversionFactor: 10,
        purchasePrice: 12.0,
        sellingPrice: 22.0,
        mrp: 24.0,
        gstRate: 12,
        hasBatchTracking: true,
        currentStock: 200,
      },
    });

    await prisma.batch.create({
      data: {
        tenantId: pharmaTenant.id,
        productId: amox.id,
        batchNumber: "AMX-9981-C",
        mfgDate: new Date("2026-02-15"),
        expiryDate: new Date("2028-05-31"),
        costPrice: 12.0,
        sellingPrice: 22.0,
        mrp: 24.0,
        currentStock: 200,
        isActive: true,
      },
    });
  }

  // =========================================================================
  // 6. PROFESSIONAL SERVICES & REPAIR TENANT
  // =========================================================================
  console.log("Creating/Updating 6. SERVICES Tenant...");
  const servicesTenant = await prisma.tenant.upsert({
    where: { slug: "demo-services" },
    update: {
      businessName: "Nexora Tech & Engineering Services",
      legalName: "Nexora Digital & Engineering Solutions LLP",
      businessType: "SERVICES",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429S1Z6",
      phone: "+91 98765 00006",
      email: "services.demo@smartvyapar.app",
      upiId: "nexoratech@okaxis",
      address: "Infopark Phase 2, IT Hub, Kakkanad, Kochi",
      pincode: "682042",
      stateCode: "32",
      stateName: "Kerala",
    },
    create: {
      slug: "demo-services",
      businessName: "Nexora Tech & Engineering Services",
      legalName: "Nexora Digital & Engineering Solutions LLP",
      businessType: "SERVICES",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCS1429S1Z6",
      phone: "+91 98765 00006",
      email: "services.demo@smartvyapar.app",
      upiId: "nexoratech@okaxis",
      address: "Infopark Phase 2, IT Hub, Kakkanad, Kochi",
      pincode: "682042",
      stateCode: "32",
      stateName: "Kerala",
    },
  });

  const servicesUser = await prisma.user.upsert({
    where: { email: "services.demo@smartvyapar.app" },
    update: {
      tenantId: servicesTenant.id,
      name: "Managing Consultant & Principal",
      phone: "+91 98765 00006",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      tenantId: servicesTenant.id,
      name: "Managing Consultant & Principal",
      email: "services.demo@smartvyapar.app",
      phone: "+91 98765 00006",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
  });

  // Services Catalog
  const serviceItems = [
    {
      name: "Enterprise Cloud Infrastructure Architecture Consulting",
      sku: "SRV-CLOUD-ARCH",
      hsnCode: "998313",
      category: "IT Consulting",
      baseUnit: "HRS",
      purchasePrice: 1500,
      sellingPrice: 3500,
      mrp: 3500,
      gstRate: 18,
    },
    {
      name: "Security Vulnerability Assessment & Penetration Audit",
      sku: "SRV-SEC-AUDIT",
      hsnCode: "998314",
      category: "Cybersecurity",
      baseUnit: "JOB",
      purchasePrice: 18000,
      sellingPrice: 45000,
      mrp: 45000,
      gstRate: 18,
    },
    {
      name: "Annual Enterprise IT Hardware Maintenance Contract (AMC)",
      sku: "SRV-IT-AMC",
      hsnCode: "998717",
      category: "Annual Maintenance",
      baseUnit: "YEAR",
      purchasePrice: 25000,
      sellingPrice: 60000,
      mrp: 60000,
      gstRate: 18,
    },
    {
      name: "Onsite Hardware Diagnostics & Emergency Repair",
      sku: "SRV-REP-EMERG",
      hsnCode: "998713",
      category: "Repair Services",
      baseUnit: "VISIT",
      purchasePrice: 500,
      sellingPrice: 1500,
      mrp: 1500,
      gstRate: 18,
    },
  ];

  for (const s of serviceItems) {
    const exists = await prisma.product.findFirst({
      where: { tenantId: servicesTenant.id, sku: s.sku },
    });
    if (!exists) {
      await prisma.product.create({
        data: {
          tenantId: servicesTenant.id,
          name: s.name,
          sku: s.sku,
          hsnCode: s.hsnCode,
          category: s.category,
          baseUnit: s.baseUnit,
          purchasePrice: s.purchasePrice,
          sellingPrice: s.sellingPrice,
          mrp: s.mrp,
          gstRate: s.gstRate,
          currentStock: 999, // Virtual / unlimited service units
        },
      });
    }
  }

  // Sample Corporate B2B Client
  const corpClient = await prisma.customer.findFirst({
    where: { tenantId: servicesTenant.id, phone: "+91 98460 77889" },
  });
  if (!corpClient) {
    await prisma.customer.create({
      data: {
        tenantId: servicesTenant.id,
        name: "Apex Global Logistics Pvt Ltd",
        phone: "+91 98460 77889",
        gstin: "32AABCA5566G1ZV",
        creditLimit: 200000,
        address: "Seaport-Airport Road, Vallarpadam, Kochi",
      },
    });
  }

  console.log("✅ Successfully seeded all 6 industry tenants and users!");
}

main()
  .catch((err) => {
    console.error("❌ Seed error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
