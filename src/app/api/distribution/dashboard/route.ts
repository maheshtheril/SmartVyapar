import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { PaymentMode, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Self-healing auto-seed for demo-distribution in database
async function ensureDistributionDemoData(tenantId: string) {
  // 1. Ensure Warehouses & Van units exist
  const warehousesData = [
    { name: "Central Master Godown", code: "WH-CENTRAL", isDefault: true, city: "Kalamassery, Kochi" },
    { name: "North District Depot", code: "WH-NORTH", isDefault: false, city: "Aluva Industrial Area" },
    { name: "Mobile Van Sales Unit 1 (Route: Ernakulam)", code: "VAN-01", isDefault: false, city: "Kochi Marine Drive Beat" },
    { name: "Mobile Van Sales Unit 2 (Route: Aluva)", code: "VAN-02", isDefault: false, city: "Aluva Market Beat" },
  ];

  for (const wh of warehousesData) {
    await prisma.warehouse.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: wh.code,
        },
      },
      update: {
        name: wh.name,
        isDefault: wh.isDefault,
        city: wh.city,
      },
      create: {
        tenantId,
        name: wh.name,
        code: wh.code,
        isDefault: wh.isDefault,
        city: wh.city,
      },
    });
  }

  // 2. Ensure FMCG Dual-Pack Products
  const fmcgProducts = [
    {
      name: "Britannia Good Day Butter Cookies 120g (Master Case)",
      barcode: "890106300101",
      sku: "FMCG-BRIT-GD72",
      hsnCode: "19053100",
      category: "Confectionery & Biscuits",
      brand: "Britannia",
      baseUnit: "PCS",
      hasAltUnit: true,
      altUnit: "BOX",
      conversionFactor: 72,
      purchasePrice: 24,
      purchasePricePerAlt: 1728,
      sellingPrice: 28,
      sellingPricePerAlt: 2016,
      mrp: 35,
      gstRate: 18,
      currentStock: 4320, // 60 Boxes
      minStockAlert: 720,
    },
    {
      name: "Parle-G Gold Glucose Biscuits 250g (Crate)",
      barcode: "890171900102",
      sku: "FMCG-PARLE-G120",
      hsnCode: "19053100",
      category: "Confectionery & Biscuits",
      brand: "Parle",
      baseUnit: "PCS",
      hasAltUnit: true,
      altUnit: "CTN",
      conversionFactor: 120,
      purchasePrice: 18,
      purchasePricePerAlt: 2160,
      sellingPrice: 22,
      sellingPricePerAlt: 2640,
      mrp: 25,
      gstRate: 18,
      currentStock: 6000, // 50 Cartons
      minStockAlert: 1200,
    },
    {
      name: "Tata Tea Premium 500g Pack (Carton)",
      barcode: "890105200103",
      sku: "FMCG-TATA-TEA24",
      hsnCode: "09024020",
      category: "Beverages & Tea",
      brand: "Tata Consumer",
      baseUnit: "PCS",
      hasAltUnit: true,
      altUnit: "CTN",
      conversionFactor: 24,
      purchasePrice: 210,
      purchasePricePerAlt: 5040,
      sellingPrice: 245,
      sellingPricePerAlt: 5880,
      mrp: 275,
      gstRate: 5,
      currentStock: 960, // 40 Cartons
      minStockAlert: 240,
    },
    {
      name: "Fortune Sunlite Refined Sunflower Oil 1L Pouch (Box)",
      barcode: "890600728104",
      sku: "FMCG-FORT-SUN15",
      hsnCode: "15121910",
      category: "Edible Oils",
      brand: "Adani Wilmar",
      baseUnit: "PCS",
      hasAltUnit: true,
      altUnit: "BOX",
      conversionFactor: 15,
      purchasePrice: 128,
      purchasePricePerAlt: 1920,
      sellingPrice: 148,
      sellingPricePerAlt: 2220,
      mrp: 165,
      gstRate: 5,
      currentStock: 1200, // 80 Boxes
      minStockAlert: 300,
    },
    {
      name: "Aashirvaad Shudh Chakki Whole Wheat Atta 10kg (Bundle)",
      barcode: "890172512105",
      sku: "FMCG-AASH-ATTA5",
      hsnCode: "11010000",
      category: "Staples & Flour",
      brand: "ITC",
      baseUnit: "BAG",
      hasAltUnit: true,
      altUnit: "BDL",
      conversionFactor: 5,
      purchasePrice: 380,
      purchasePricePerAlt: 1900,
      sellingPrice: 435,
      sellingPricePerAlt: 2175,
      mrp: 485,
      gstRate: 0,
      currentStock: 250, // 50 Bundles
      minStockAlert: 50,
    },
    {
      name: "Cadbury Dairy Milk Silk 60g Chocolate (Master Box)",
      barcode: "762220114106",
      sku: "FMCG-CADB-SILK48",
      hsnCode: "18063200",
      category: "Chocolates",
      brand: "Mondelez",
      baseUnit: "PCS",
      hasAltUnit: true,
      altUnit: "BOX",
      conversionFactor: 48,
      purchasePrice: 65,
      purchasePricePerAlt: 3120,
      sellingPrice: 76,
      sellingPricePerAlt: 3648,
      mrp: 90,
      gstRate: 18,
      currentStock: 1440, // 30 Boxes
      minStockAlert: 288,
    },
  ];

  for (const fp of fmcgProducts) {
    const existing = await prisma.product.findFirst({
      where: { tenantId, sku: fp.sku },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          tenantId,
          ...fp,
        },
      });
    }
  }

  // 3. Ensure B2B Wholesale Customers with Real Credit Limits & Outstanding Balances
  const b2bCustomers = [
    {
      name: "Grand Hypermarket & Departmental Store",
      phone: "+91 94471 88990",
      email: "procurement@grandhyper.in",
      gstin: "32AABCG5544K1ZX",
      address: "Bypass Junction, Edappally, Kochi",
      creditLimit: 300000,
      outstandingBalance: 124500,
    },
    {
      name: "Arogya Super Bazaar Wholesale",
      phone: "+91 98950 11223",
      email: "orders@arogyasuperbazaar.com",
      gstin: "32AAACA1234F1Z9",
      address: "Goods Shed Road, Willingdon Island, Cochin",
      creditLimit: 200000,
      outstandingBalance: 86400,
    },
    {
      name: "Kochi Provision & General Stores (Marine Drive Beat)",
      phone: "+91 98470 55443",
      email: "kochiprov@gmail.com",
      gstin: "32ABCPR9988L1Z2",
      address: "Shanmugham Road, Ernakulam Market",
      creditLimit: 100000,
      outstandingBalance: 42100,
    },
    {
      name: "City Kirana Mart (Palarivattom Beat)",
      phone: "+91 98951 22334",
      email: "citykirana@gmail.com",
      address: "Civil Line Road, Palarivattom, Kochi",
      creditLimit: 75000,
      outstandingBalance: 28900,
    },
    {
      name: "Aluva Central Grocery Traders (Aluva Beat)",
      phone: "+91 97460 33221",
      email: "aluva.traders@outlook.com",
      gstin: "32AACCA7766M1Z8",
      address: "Railway Station Road, Aluva Market",
      creditLimit: 150000,
      outstandingBalance: 63200,
    },
  ];

  for (const c of b2bCustomers) {
    const existing = await prisma.customer.findFirst({
      where: { tenantId, phone: c.phone },
    });
    if (!existing) {
      await prisma.customer.create({
        data: {
          tenantId,
          ...c,
        },
      });
    }
  }

  // 4. Ensure Real Delivery Challans (GST Rule 55) exist
  const challanCount = await prisma.deliveryChallan.count({ where: { tenantId } });
  if (challanCount === 0) {
    const challan1 = await prisma.deliveryChallan.create({
      data: {
        tenantId,
        challanNumber: "DC-2026-0001",
        recipientName: "Grand Hypermarket & Departmental Store",
        recipientPhone: "+91 94471 88990",
        recipientAddress: "Bypass Junction, Edappally, Kochi",
        recipientGstin: "32AABCG5544K1ZX",
        transporterName: "Horizon Fleet Logistics",
        vehicleNo: "KL-07-CD-4011",
        placeOfSupply: "Kochi Central Beat",
        status: "DISPATCHED",
        subtotal: 85740,
        cgstAmount: 4109,
        sgstAmount: 4109,
        totalTax: 8218,
        totalAmount: 93958,
        items: {
          create: [
            {
              productName: "Fortune Sunlite Refined Sunflower Oil 1L (25 Boxes)",
              unit: "BOX",
              quantity: 25,
              unitPrice: 2220,
              gstRate: 5,
              lineTotal: 55500,
            },
            {
              productName: "Britannia Good Day Butter Cookies 120g (15 Boxes)",
              unit: "BOX",
              quantity: 15,
              unitPrice: 2016,
              gstRate: 18,
              lineTotal: 30240,
            },
          ],
        },
      },
    });

    const challan2 = await prisma.deliveryChallan.create({
      data: {
        tenantId,
        challanNumber: "DC-2026-0002",
        recipientName: "Arogya Super Bazaar Wholesale",
        recipientPhone: "+91 98950 11223",
        recipientAddress: "Goods Shed Road, Willingdon Island",
        recipientGstin: "32AAACA1234F1Z9",
        transporterName: "Horizon Fleet Logistics",
        vehicleNo: "KL-07-CD-4012",
        placeOfSupply: "Willingdon Island Beat",
        status: "DISPATCHED",
        subtotal: 58800,
        cgstAmount: 1470,
        sgstAmount: 1470,
        totalTax: 2940,
        totalAmount: 61740,
        items: {
          create: [
            {
              productName: "Tata Tea Premium 500g (10 Cartons)",
              unit: "CTN",
              quantity: 10,
              unitPrice: 5880,
              gstRate: 5,
              lineTotal: 58800,
            },
          ],
        },
      },
    });
  }

  // 5. Ensure B2B Customer Invoices for Today exist
  const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
  if (invoiceCount === 0) {
    const demoInvoices = [
      {
        invoiceNumber: "INV-2610-0301",
        customerName: "Grand Hypermarket & Departmental Store",
        customerPhone: "+91 94471 88990",
        paymentMode: PaymentMode.CREDIT,
        notes: "30-Day Wholesale Khata Credit (Beat: Edappally)",
        subtotal: 124500,
        cgstAmount: 9800,
        sgstAmount: 9800,
        totalTax: 19600,
        totalAmount: 144100,
        items: [
          { name: "Fortune Sunlite Refined Sunflower Oil 1L (40 Boxes)", qty: 40, unit: "BOX", price: 2220, gst: 5, lineTotal: 88800 },
          { name: "Tata Tea Premium 500g (8 Cartons)", qty: 8, unit: "CTN", price: 5880, gst: 5, lineTotal: 47040 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0302",
        customerName: "Arogya Super Bazaar Wholesale",
        customerPhone: "+91 98950 11223",
        paymentMode: PaymentMode.BANK_TRANSFER,
        notes: "NEFT / RTGS Clearance (HDFC Bank)",
        subtotal: 98400,
        cgstAmount: 8856,
        sgstAmount: 8856,
        totalTax: 17712,
        totalAmount: 116112,
        items: [
          { name: "Britannia Good Day Butter Cookies 120g (30 Boxes)", qty: 30, unit: "BOX", price: 2016, gst: 18, lineTotal: 60480 },
          { name: "Parle-G Gold Glucose Biscuits 250g (20 Cartons)", qty: 20, unit: "CTN", price: 2640, gst: 18, lineTotal: 52800 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0303",
        customerName: "Kochi Provision & General Stores",
        customerPhone: "+91 98470 55443",
        paymentMode: PaymentMode.CREDIT,
        notes: "15-Day Beat Credit Term",
        subtotal: 48600,
        cgstAmount: 4374,
        sgstAmount: 4374,
        totalTax: 8748,
        totalAmount: 57348,
        items: [
          { name: "Cadbury Dairy Milk Silk 60g (10 Master Boxes)", qty: 10, unit: "BOX", price: 3648, gst: 18, lineTotal: 36480 },
          { name: "Aashirvaad Shudh Chakki Atta 10kg (10 Bundles)", qty: 10, unit: "BDL", price: 2175, gst: 0, lineTotal: 21750 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0304",
        customerName: "City Kirana Mart (Palarivattom)",
        customerPhone: "+91 98951 22334",
        paymentMode: PaymentMode.UPI,
        notes: "UPI QR Dynamic Van Collection",
        subtotal: 32400,
        cgstAmount: 2916,
        sgstAmount: 2916,
        totalTax: 5832,
        totalAmount: 38232,
        items: [
          { name: "Parle-G Gold Glucose Biscuits 250g (12 Cartons)", qty: 12, unit: "CTN", price: 2640, gst: 18, lineTotal: 31680 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0305",
        customerName: "Aluva Central Grocery Traders",
        customerPhone: "+91 97460 33221",
        paymentMode: PaymentMode.CREDIT,
        notes: "Van Sales Delivery Order (Aluva Market)",
        subtotal: 58900,
        cgstAmount: 3820,
        sgstAmount: 3820,
        totalTax: 7640,
        totalAmount: 66540,
        items: [
          { name: "Tata Tea Premium 500g (8 Cartons)", qty: 8, unit: "CTN", price: 5880, gst: 5, lineTotal: 47040 },
          { name: "Britannia Good Day Butter Cookies 120g (8 Boxes)", qty: 8, unit: "BOX", price: 2016, gst: 18, lineTotal: 16128 },
        ],
      },
    ];

    for (const inv of demoInvoices) {
      const createdInv = await prisma.invoice.create({
        data: {
          tenantId,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          customerStateCode: "32",
          isInterState: false,
          subtotal: inv.subtotal,
          cgstAmount: inv.cgstAmount,
          sgstAmount: inv.sgstAmount,
          totalTax: inv.totalTax,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paymentMode === PaymentMode.CREDIT ? 0 : inv.totalAmount,
          dueAmount: inv.paymentMode === PaymentMode.CREDIT ? inv.totalAmount : 0,
          paymentStatus: inv.paymentMode === PaymentMode.CREDIT ? PaymentStatus.UNPAID : PaymentStatus.PAID,
          paymentMode: inv.paymentMode,
          notes: inv.notes,
        },
      });

      for (const it of inv.items) {
        await prisma.invoiceItem.create({
          data: {
            invoiceId: createdInv.id,
            productName: it.name,
            hsnCode: "1905",
            unitSold: it.unit,
            quantity: it.qty,
            baseQuantity: it.qty,
            unitPrice: it.price,
            gstRate: it.gst,
            cgstAmount: Math.round(((it.lineTotal * (it.gst / 2)) / 100) * 100) / 100,
            sgstAmount: Math.round(((it.lineTotal * (it.gst / 2)) / 100) * 100) / 100,
            lineTotal: it.lineTotal,
          },
        });
      }
    }
  }

  console.log(`[AutoSeed] Finished seeding Horizon FMCG wholesale distribution data.`);
}

// GET /api/distribution/dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Self-healing: ensure distribution demo data is seeded
    await ensureDistributionDemoData(tenantId);

    const [warehouses, challans, customers, products, invoices] = await Promise.all([
      prisma.warehouse.findMany({
        where: { tenantId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      prisma.deliveryChallan.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { challanDate: "desc" },
        take: 10,
      }),
      prisma.customer.findMany({
        where: { tenantId },
        orderBy: { outstandingBalance: "desc" },
        take: 10,
      }),
      prisma.product.findMany({
        where: { tenantId },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.invoice.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { invoiceDate: "desc" },
        take: 10,
      }),
    ]);

    // Compute dynamic KPI metrics directly from real database records
    const todayBillingTotal = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalMarketReceivables = customers.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);
    const activeChallansCount = challans.filter((ch) => ch.status === "DISPATCHED").length;
    const totalInventoryUnits = products.reduce((sum, p) => sum + Number(p.currentStock || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        todayBillingTotal,
        totalMarketReceivables,
        activeChallansCount,
        warehouseCount: warehouses.length,
        totalSkusCount: products.length,
        totalInventoryUnits,
        invoiceCount: invoices.length,
      },
      warehouses,
      challans,
      customers,
      products,
      invoices,
    });
  } catch (error: any) {
    console.error("Error in GET /api/distribution/dashboard:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
