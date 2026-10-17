import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ensureDefaultWarehouse } from "@/lib/warehouse-transfer";
import { seedDefaultAccounts } from "@/lib/default-accounts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json().catch(() => ({}));
    const industry = 
      ["RETAIL", "RESTAURANT", "PHARMACY", "AUTOMOBILE", "APPAREL", "ELECTRONICS", "SALON_SPA"].includes(body.industry?.toUpperCase())
        ? body.industry.toUpperCase()
        : "PHARMACY";

    const defaultWh = await ensureDefaultWarehouse(tenantId);

    // 1. Update Tenant businessType
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        businessType: industry,
        ...(industry === "PHARMACY" ? {
          pharmacyDrugLicense20B: "KL-EKM-20B-184920",
          pharmacyDrugLicense21B: "KL-EKM-21B-184921",
        } : {}),
      },
    });

    // 2. Ensure default Chart of Accounts is seeded
    await seedDefaultAccounts(prisma, tenantId);

    // 3. Seed Sample Customers
    const customersData = [
      { name: "Rahul Sharma", phone: "9876543210", stateCode: "32", outstandingBalance: 450 },
      { name: "Priya Nair", phone: "9847123456", stateCode: "32", outstandingBalance: 0 },
    ];

    for (const c of customersData) {
      const existing = await prisma.customer.findFirst({
        where: { tenantId, phone: c.phone },
      });
      if (!existing) {
        await prisma.customer.create({
          data: { tenantId, ...c },
        });
      }
    }

    const customer = await prisma.customer.findFirst({ where: { tenantId } });

    // 4. Industry-Specific Seed Data
    if (industry === "PHARMACY") {
      // Seed Sample Doctors
      const doctors = [
        { name: "Ramesh Varma", regNumber: "KMC-49281", qualification: "MBBS, MD (Medicine)", clinicName: "City Health Clinic", phone: "9847001122", city: "Kochi" },
        { name: "Anjali Menon", regNumber: "KMC-84920", qualification: "MBBS, DNB (Pediatrics)", clinicName: "Care Child Hospital", phone: "9847003344", city: "Kochi" },
      ];

      for (const d of doctors) {
        await prisma.doctor.upsert({
          where: { tenantId_name: { tenantId, name: d.name } },
          create: { tenantId, ...d },
          update: {},
        });
      }

      // Seed Pharmacy Products with Batches & Schedules
      const pharmaProducts = [
        {
          name: "Dolo 650mg Paracetamol Tablets",
          drugGenericName: "Paracetamol 650mg",
          dosageForm: "TABLET",
          hsnCode: "300490",
          baseUnit: "TAB",
          hasAltUnit: true,
          altUnit: "STRIP",
          conversionFactor: 15,
          purchasePrice: 1.5,
          sellingPrice: 2.15,
          mrp: 32.5,
          gstRate: 12.0,
          currentStock: 300,
          isScheduleH: false,
          isScheduleH1: false,
          batchNumber: "DL-9941",
          expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000), // Fresh
        },
        {
          name: "Augmentin 625 Duo Tablets",
          drugGenericName: "Amoxicillin 500mg + Potassium Clavulanate 125mg",
          dosageForm: "TABLET",
          hsnCode: "300420",
          baseUnit: "TAB",
          hasAltUnit: true,
          altUnit: "STRIP",
          conversionFactor: 10,
          purchasePrice: 15.0,
          sellingPrice: 20.4,
          mrp: 204.0,
          gstRate: 12.0,
          currentStock: 120,
          isScheduleH: false,
          isScheduleH1: true, // Schedule H1 antibiotic
          batchNumber: "AG-7712",
          expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000),
        },
        {
          name: "Azithral 500mg Tablets",
          drugGenericName: "Azithromycin 500mg",
          dosageForm: "TABLET",
          hsnCode: "300420",
          baseUnit: "TAB",
          hasAltUnit: true,
          altUnit: "STRIP",
          conversionFactor: 5,
          purchasePrice: 18.0,
          sellingPrice: 23.8,
          mrp: 119.0,
          gstRate: 12.0,
          currentStock: 50,
          isScheduleH: true, // Schedule H
          isScheduleH1: false,
          batchNumber: "AZ-4421",
          expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // < 30 days near expiry for alert demo!
        },
        {
          name: "Benadryl Cough Formula 100ml",
          drugGenericName: "Diphenhydramine HCl + Ammonium Chloride",
          dosageForm: "SYRUP",
          hsnCode: "300490",
          baseUnit: "BOTTLE",
          purchasePrice: 110.0,
          sellingPrice: 142.0,
          mrp: 142.0,
          gstRate: 12.0,
          currentStock: 40,
          isScheduleH: true,
          batchNumber: "BN-1029",
          expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const p of pharmaProducts) {
        const { batchNumber, expiryDate, ...prodFields } = p;
        const createdProd = await prisma.product.upsert({
          where: { tenantId_sku: { tenantId, sku: `SKU-${prodFields.name.slice(0, 3).toUpperCase()}` } },
          create: {
            tenantId,
            sku: `SKU-${prodFields.name.slice(0, 3).toUpperCase()}`,
            hasBatchTracking: true,
            ...prodFields,
          },
          update: {
            currentStock: prodFields.currentStock,
            drugGenericName: prodFields.drugGenericName,
            isScheduleH: prodFields.isScheduleH,
            isScheduleH1: prodFields.isScheduleH1,
          },
        });

        // Seed Batch
        await prisma.batch.upsert({
          where: {
            tenantId_productId_batchNumber: {
              tenantId,
              productId: createdProd.id,
              batchNumber,
            },
          },
          create: {
            tenantId,
            productId: createdProd.id,
            batchNumber,
            expiryDate,
            costPrice: prodFields.purchasePrice,
            sellingPrice: prodFields.sellingPrice,
            mrp: prodFields.mrp || prodFields.sellingPrice,
            currentStock: prodFields.currentStock,
          },
          update: {
            currentStock: prodFields.currentStock,
          },
        });
      }
    } else if (industry === "RESTAURANT") {
      // Seed Dining Tables
      const tables = [
        { name: "T-01", section: "Main Dining Hall", capacity: 4 },
        { name: "T-02", section: "Main Dining Hall", capacity: 4 },
        { name: "AC-1", section: "Family AC Hall", capacity: 6 },
        { name: "R-01", section: "Rooftop Garden", capacity: 2 },
        { name: "Takeaway Counter", section: "Takeaway Counter", capacity: 99 },
      ];

      for (const t of tables) {
        await prisma.restaurantTable.upsert({
          where: { tenantId_name: { tenantId, name: t.name } },
          create: { tenantId, ...t },
          update: {},
        });
      }

      // Seed Restaurant Dishes
      const dishes = [
        { name: "Thalassery Chicken Biryani", sellingPrice: 240, purchasePrice: 120, gstRate: 5.0, currentStock: 80 },
        { name: "Butter Chicken (Special)", sellingPrice: 280, purchasePrice: 140, gstRate: 5.0, currentStock: 60 },
        { name: "Tandoori Butter Naan", sellingPrice: 45, purchasePrice: 15, gstRate: 5.0, currentStock: 200 },
        { name: "Fresh Lime Mint Cooler", sellingPrice: 60, purchasePrice: 18, gstRate: 5.0, currentStock: 150 },
      ];

      for (const d of dishes) {
        await prisma.product.upsert({
          where: { tenantId_sku: { tenantId, sku: `DISH-${d.name.slice(0, 3).toUpperCase()}` } },
          create: {
            tenantId,
            sku: `DISH-${d.name.slice(0, 3).toUpperCase()}`,
            baseUnit: "PORTION",
            hsnCode: "996331",
            ...d,
          },
          update: { currentStock: d.currentStock },
        });
      }
    } else if (industry === "APPAREL") {
      const apparelItems = [
        { name: "Raymond Slim Fit Cotton Shirt (Size 40, Sky Blue)", barcode: "890200100101", sellingPrice: 1499, purchasePrice: 850, mrp: 1699, gstRate: 12.0, currentStock: 30, hsnCode: "620520", baseUnit: "PCS", category: "Formal Shirts", brand: "Raymond" },
        { name: "Levi's 511 Slim Jeans (Size 32, Dark Indigo)", barcode: "890200100102", sellingPrice: 2499, purchasePrice: 1450, mrp: 2799, gstRate: 12.0, currentStock: 25, hsnCode: "620342", baseUnit: "PCS", category: "Denim Jeans", brand: "Levi's" },
        { name: "Pure Kanchipuram Silk Saree (Crimson Gold)", barcode: "890200100103", sellingPrice: 6500, purchasePrice: 4200, mrp: 7500, gstRate: 5.0, currentStock: 15, hsnCode: "500720", baseUnit: "PCS", category: "Ethnic Sarees", brand: "Heritage Silk" },
        { name: "Linen Suiting Fabric (Unstitched)", barcode: "890200100104", sellingPrice: 850, purchasePrice: 520, mrp: 950, gstRate: 5.0, currentStock: 120, hsnCode: "530919", baseUnit: "MTR", category: "Cut Pieces", brand: "Linen Club" },
      ];

      for (const a of apparelItems) {
        await prisma.product.upsert({
          where: { tenantId_barcode: { tenantId, barcode: a.barcode } },
          create: { tenantId, sku: `APP-${a.barcode.slice(-4)}`, ...a },
          update: { currentStock: a.currentStock },
        });
      }
    } else if (industry === "ELECTRONICS") {
      const electronicsItems = [
        { name: "Apple iPhone 16 Pro 128GB (Natural Titanium)", barcode: "195949000101", sellingPrice: 119900, purchasePrice: 104000, mrp: 119900, gstRate: 18.0, currentStock: 8, hsnCode: "851713", baseUnit: "PCS", category: "Smartphones", brand: "Apple", hasSerialTracking: true },
        { name: "Samsung Galaxy S24 Ultra 256GB (Titanium Gray)", barcode: "880609500102", sellingPrice: 129999, purchasePrice: 112000, mrp: 134999, gstRate: 18.0, currentStock: 6, hsnCode: "851713", baseUnit: "PCS", category: "Smartphones", brand: "Samsung", hasSerialTracking: true },
        { name: "Sony WH-1000XM5 Wireless ANC Headphones", barcode: "454873600103", sellingPrice: 28990, purchasePrice: 22500, mrp: 34990, gstRate: 18.0, currentStock: 12, hsnCode: "851830", baseUnit: "PCS", category: "Audio", brand: "Sony", hasSerialTracking: true },
        { name: "Dell Inspiron 15 Core i5 16GB/512GB SSD", barcode: "884116000104", sellingPrice: 56990, purchasePrice: 47500, mrp: 62000, gstRate: 18.0, currentStock: 10, hsnCode: "847130", baseUnit: "PCS", category: "Laptops", brand: "Dell", hasSerialTracking: true },
      ];

      for (const e of electronicsItems) {
        await prisma.product.upsert({
          where: { tenantId_barcode: { tenantId, barcode: e.barcode } },
          create: { tenantId, sku: `ELEC-${e.barcode.slice(-4)}`, ...e },
          update: { currentStock: e.currentStock },
        });
      }
    } else if (industry === "SALON_SPA") {
      const salonServices = [
        { name: "Signature Haircut & Beard Styling (Director Stylist)", sellingPrice: 650, purchasePrice: 0, mrp: 700, gstRate: 18.0, currentStock: 999, hsnCode: "999721", baseUnit: "SERVICE", category: "Hair Styling" },
        { name: "L'Oreal Keratin Hair Spa Treatment", sellingPrice: 1800, purchasePrice: 450, mrp: 2200, gstRate: 18.0, currentStock: 999, hsnCode: "999721", baseUnit: "SERVICE", category: "Hair Treatments" },
        { name: "Bridal Radiance Hydra-Facial Therapy (90 mins)", sellingPrice: 3200, purchasePrice: 600, mrp: 3800, gstRate: 18.0, currentStock: 999, hsnCode: "999722", baseUnit: "SERVICE", category: "Skin & Spa" },
        { name: "Moroccanoil Treatment Original 100ml (Retail)", barcode: "729001150105", sellingPrice: 3150, purchasePrice: 2400, mrp: 3300, gstRate: 18.0, currentStock: 20, hsnCode: "330590", baseUnit: "PCS", category: "Retail Products" },
      ];

      for (const s of salonServices) {
        const sku = `SALON-${s.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "")}`;
        await prisma.product.upsert({
          where: { tenantId_sku: { tenantId, sku } },
          create: { tenantId, sku, ...s },
          update: { currentStock: s.currentStock },
        });
      }
    } else {
      // RETAIL / SUPERMARKET
      const retailItems = [
        { name: "India Gate Basmati Rice 5kg", barcode: "890123456701", sellingPrice: 580, purchasePrice: 460, mrp: 620, gstRate: 5.0, currentStock: 45, hsnCode: "100630", baseUnit: "BAG" },
        { name: "Fortune Sunlite Sunflower Oil 1L", barcode: "890123456702", sellingPrice: 155, purchasePrice: 130, mrp: 165, gstRate: 5.0, currentStock: 90, hsnCode: "151219", baseUnit: "PKT" },
        { name: "Amul Butter Pasteurised 500g", barcode: "890123456703", sellingPrice: 275, purchasePrice: 245, mrp: 285, gstRate: 12.0, currentStock: 60, hsnCode: "040510", baseUnit: "PACK" },
        { name: "Britannia Good Day Cookies 600g", barcode: "890123456704", sellingPrice: 120, purchasePrice: 95, mrp: 130, gstRate: 18.0, currentStock: 110, hsnCode: "190531", baseUnit: "PACK" },
        { name: "Tata Tea Premium 500g", barcode: "890123456705", sellingPrice: 260, purchasePrice: 220, mrp: 275, gstRate: 5.0, currentStock: 50, hsnCode: "090230", baseUnit: "PKT" },
      ];

      for (const r of retailItems) {
        await prisma.product.upsert({
          where: { tenantId_barcode: { tenantId, barcode: r.barcode } },
          create: { tenantId, sku: `SKU-${r.barcode.slice(-4)}`, ...r },
          update: { currentStock: r.currentStock },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully loaded 1-click enterprise demo data for ${industry}!`,
      industry,
    });
  } catch (error: any) {
    console.error("Error seeding demo data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
