import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { PaymentMode, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Self-healing auto-seed for demo-apparel so it never appears empty
async function ensureApparelDemoData(tenantId: string) {
  // 1. Ensure full 2D Size-Color Variant Matrix exists
  const shirtSizes = ["38", "40", "42", "44"];
  const shirtColors = [
    { name: "Sky Blue", code: "BLU" },
    { name: "Crisp White", code: "WHT" },
    { name: "Navy Blue", code: "NVY" },
    { name: "Onyx Black", code: "BLK" },
  ];

  for (const s of shirtSizes) {
    for (const c of shirtColors) {
      const barcode = `890200${s}${c.code}`;
      const sku = `APP-RAY-${s}-${c.code}`;
      const existing = await prisma.product.findFirst({
        where: { tenantId, sku },
      });
      if (!existing) {
        await prisma.product.create({
          data: {
            tenantId,
            name: `Raymond Slim Fit Cotton Shirt (Size ${s}, ${c.name})`,
            displayName: `Size ${s} • ${c.name}`,
            category: "Formal Shirts",
            brand: "Raymond",
            barcode,
            sku,
            hsnCode: "620520",
            baseUnit: "PCS",
            purchasePrice: 850,
            sellingPrice: 1499,
            mrp: 1699,
            gstRate: 12,
            currentStock: Math.floor(10 + Math.random() * 15),
            minStockAlert: 3,
          },
        });
      }
    }
  }

  // 2. Ensure Levi's Jeans across Waist Sizes & Washes
  const jeanSizes = ["30", "32", "34", "36"];
  const jeanColors = [
    { name: "Dark Indigo", code: "IND" },
    { name: "Washed Blue", code: "WSH" },
    { name: "Carbon Black", code: "BLK" },
  ];

  for (const s of jeanSizes) {
    for (const c of jeanColors) {
      const barcode = `890300${s}${c.code}`;
      const sku = `APP-LEV-${s}-${c.code}`;
      const existing = await prisma.product.findFirst({
        where: { tenantId, sku },
      });
      if (!existing) {
        await prisma.product.create({
          data: {
            tenantId,
            name: `Levi's 511 Slim Stretch Denim (Waist ${s}, ${c.name})`,
            displayName: `Waist ${s} • ${c.name}`,
            category: "Denim Jeans",
            brand: "Levi's",
            barcode,
            sku,
            hsnCode: "620342",
            baseUnit: "PCS",
            purchasePrice: 1450,
            sellingPrice: 2499,
            mrp: 2799,
            gstRate: 12,
            currentStock: Math.floor(8 + Math.random() * 12),
            minStockAlert: 2,
          },
        });
      }
    }
  }

  // 3. Ensure Pure Kanchipuram Silk Sarees (Ethnic Wear)
  const sarees = [
    { name: "Pure Kanchipuram Silk Saree (Crimson Gold Zari)", color: "Crimson Gold", code: "KNC-CRM", price: 6500, mrp: 7999, stock: 12 },
    { name: "Pure Kanchipuram Silk Saree (Peacock Royal Green)", color: "Peacock Green", code: "KNC-GRN", price: 6800, mrp: 8200, stock: 10 },
    { name: "Banarasi Katan Silk Saree (Temple Maroon)", color: "Temple Maroon", code: "BAN-MRN", price: 5400, mrp: 6500, stock: 14 },
    { name: "Mysore Crepe Silk Festive Saree (Royal Purple)", color: "Royal Purple", code: "MYS-PRP", price: 4200, mrp: 4999, stock: 16 },
  ];

  for (const sr of sarees) {
    const sku = `APP-SR-${sr.code}`;
    const existing = await prisma.product.findFirst({
      where: { tenantId, sku },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          tenantId,
          name: sr.name,
          displayName: `${sr.color} • Silk Zari`,
          category: "Ethnic Sarees",
          brand: "Heritage Silks",
          barcode: `890400${sr.code}`,
          sku,
          hsnCode: "500720",
          baseUnit: "PCS",
          purchasePrice: sr.price * 0.65,
          sellingPrice: sr.price,
          mrp: sr.mrp,
          gstRate: 5,
          currentStock: sr.stock,
          minStockAlert: 2,
        },
      });
    }
  }

  // 4. Ensure Linen Club Unstitched Fabric (Meters)
  const fabrics = [
    { name: "Linen Club 60s Pure Linen Suiting (Natural Beige)", color: "Natural Beige", code: "LIN-BGE", price: 850, mrp: 999, meters: 85 },
    { name: "Linen Club Italian Suiting Fabric (Charcoal Melange)", color: "Charcoal Melange", code: "LIN-CHR", price: 920, mrp: 1100, meters: 65 },
    { name: "Raymond Premium Wool Blend Suiting (Midnight Blue)", color: "Midnight Blue", code: "RAY-BLU", price: 1250, mrp: 1450, meters: 45 },
    { name: "Giza Cotton 80s Luxury Shirting Fabric (Ivory)", color: "Ivory", code: "GIZ-IVR", price: 620, mrp: 750, meters: 110 },
  ];

  for (const fb of fabrics) {
    const sku = `FAB-${fb.code}`;
    const existing = await prisma.product.findFirst({
      where: { tenantId, sku },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          tenantId,
          name: fb.name,
          displayName: `${fb.color} • Unstitched Roll`,
          category: "Unstitched Fabric",
          brand: "Linen Club",
          barcode: `890500${fb.code}`,
          sku,
          hsnCode: "530919",
          baseUnit: "MTR",
          purchasePrice: fb.price * 0.6,
          sellingPrice: fb.price,
          mrp: fb.mrp,
          gstRate: 5,
          currentStock: fb.meters,
          minStockAlert: 20,
        },
      });
    }
  }

  // 5. Seed Realistic Customer Invoices if none exist
  const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
  if (invoiceCount === 0) {
    const demoSales = [
      {
        invoiceNumber: "INV-2610-0201",
        customerName: "Meera Krishnan",
        customerPhone: "+91 98471 90812",
        paymentMode: PaymentMode.CARD,
        notes: "Card Payment (POS Terminal 01)",
        items: [
          { name: "Pure Kanchipuram Silk Saree (Crimson Gold Zari)", hsn: "500720", qty: 1, unit: "PCS", price: 6500, gstRate: 5 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0202",
        customerName: "Arjun Menon",
        customerPhone: "+91 98765 22110",
        paymentMode: PaymentMode.UPI,
        notes: "Dynamic UPI QR (PhonePe)",
        items: [
          { name: "Raymond Slim Fit Cotton Shirt (Size 40, Sky Blue)", hsn: "620520", qty: 1, unit: "PCS", price: 1499, gstRate: 12 },
          { name: "Levi's 511 Slim Stretch Denim (Waist 32, Dark Indigo)", hsn: "620342", qty: 1, unit: "PCS", price: 2499, gstRate: 12 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0203",
        customerName: "Deepak Varma",
        customerPhone: "+91 94470 33441",
        paymentMode: PaymentMode.CASH,
        notes: "Cash Counter 02",
        items: [
          { name: "Linen Club 60s Pure Linen Suiting (Natural Beige)", hsn: "530919", qty: 3.25, unit: "MTR", price: 850, gstRate: 5 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0204",
        customerName: "Ananya Pillai",
        customerPhone: "+91 98950 44552",
        paymentMode: PaymentMode.UPI,
        notes: "Google Pay UPI",
        items: [
          { name: "Banarasi Katan Silk Saree (Temple Maroon)", hsn: "500720", qty: 1, unit: "PCS", price: 5400, gstRate: 5 },
          { name: "Raymond Slim Fit Cotton Shirt (Size 38, Crisp White)", hsn: "620520", qty: 1, unit: "PCS", price: 1499, gstRate: 12 },
        ],
      },
      {
        invoiceNumber: "INV-2610-0205",
        customerName: "Sanjay Nambiar",
        customerPhone: "+91 98460 77889",
        paymentMode: PaymentMode.CARD,
        notes: "HDFC Credit Card Tap & Pay",
        items: [
          { name: "Raymond Premium Wool Blend Suiting (Midnight Blue)", hsn: "530919", qty: 2.5, unit: "MTR", price: 1250, gstRate: 5 },
          { name: "Raymond Slim Fit Cotton Shirt (Size 42, Navy Blue)", hsn: "620520", qty: 1, unit: "PCS", price: 1499, gstRate: 12 },
        ],
      },
    ];

    for (const s of demoSales) {
      let subtotal = 0;
      let totalTax = 0;
      let grandTotal = 0;
      const lineItemsData: any[] = [];

      for (const it of s.items) {
        const lineBase = it.price * it.qty;
        const taxable = Math.round((lineBase / (1 + it.gstRate / 100)) * 100) / 100;
        const cgst = Math.round(((taxable * (it.gstRate / 2)) / 100) * 100) / 100;
        const sgst = Math.round((lineBase - taxable - cgst) * 100) / 100;

        subtotal += taxable;
        totalTax += cgst + sgst;
        grandTotal += lineBase;

        const p = await prisma.product.findFirst({
          where: { tenantId, name: it.name },
        });

        lineItemsData.push({
          productId: p?.id || null,
          productName: it.name,
          hsnCode: it.hsn,
          unitSold: it.unit,
          quantity: it.qty,
          baseQuantity: it.qty,
          unitPrice: taxable / it.qty,
          gstRate: it.gstRate,
          cgstAmount: cgst,
          sgstAmount: sgst,
          lineTotal: lineBase,
        });
      }

      const inv = await prisma.invoice.create({
        data: {
          tenantId,
          invoiceNumber: s.invoiceNumber,
          customerName: s.customerName,
          customerPhone: s.customerPhone,
          customerStateCode: "32",
          isInterState: false,
          subtotal,
          cgstAmount: Math.round((totalTax / 2) * 100) / 100,
          sgstAmount: Math.round((totalTax / 2) * 100) / 100,
          totalTax,
          totalAmount: grandTotal,
          paidAmount: grandTotal,
          dueAmount: 0,
          paymentStatus: PaymentStatus.PAID,
          paymentMode: s.paymentMode,
          notes: s.notes,
        },
      });

      for (const li of lineItemsData) {
        await prisma.invoiceItem.create({
          data: {
            invoiceId: inv.id,
            ...li,
          },
        });
      }
    }
  }
}

// GET /api/apparel/catalog
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Self-healing: ensure apparel demo catalog and invoices are seeded
    await ensureApparelDemoData(tenantId);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q")?.trim();

    const where: any = { tenantId };

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { barcode: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ];
    }

    const [products, allTenantProducts, invoices] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.product.findMany({
        where: { tenantId },
        select: { brand: true, category: true, baseUnit: true },
      }),
      prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { invoiceDate: "desc" },
        take: 5,
        include: {
          items: true,
        },
      }),
    ]);

    // Compute stats
    let totalGarmentsCount = 0;
    let totalFabricMeters = 0;

    for (const p of products) {
      if (p.baseUnit === "MTR") {
        totalFabricMeters += Number(p.currentStock || 0);
      } else {
        totalGarmentsCount += Number(p.currentStock || 0);
      }
    }

    const todaySales = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    // Extract dynamic brands and categories from actual database products
    const rawBrands = allTenantProducts.map((p) => p.brand).filter((b): b is string => Boolean(b && b.trim()));
    const availableBrands = Array.from(new Set(rawBrands));

    const rawCategories = allTenantProducts.map((p) => p.category).filter((c): c is string => Boolean(c && c.trim()));
    const availableCategories = Array.from(new Set(rawCategories));

    return NextResponse.json({
      success: true,
      stats: {
        totalVariantsCount: products.length,
        totalGarmentsCount,
        totalFabricMeters: Math.round(totalFabricMeters * 10) / 10,
        todaySales,
        recentInvoiceCount: invoices.length,
      },
      availableBrands,
      availableCategories,
      products,
      recentInvoices: invoices,
    });
  } catch (error: any) {
    console.error("Error in GET /api/apparel/catalog:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
