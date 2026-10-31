import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { DeviceStatus, PaymentMode, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Self-healing auto-seed for demo-electronics so it never appears empty
async function ensureElectronicsDemoData(tenantId: string) {
  const existingDevices = await prisma.deviceUnit.count({ where: { tenantId } });
  if (existingDevices > 0) return;

  console.log(`[AutoSeed] Seeding Electronics demo devices and invoices for tenant: ${tenantId}`);

  // 1. Ensure Top Electronics Products
  const productsData = [
    {
      name: "Apple iPhone 16 Pro 128GB (Natural Titanium)",
      sku: "ELEC-IPH16P-128",
      barcode: "195949000101",
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
      sku: "ELEC-S24U-256",
      barcode: "880609500102",
      hsnCode: "851713",
      category: "Smartphones",
      brand: "Samsung",
      baseUnit: "PCS",
      purchasePrice: 112000,
      sellingPrice: 129999,
      mrp: 134999,
      gstRate: 18,
      currentStock: 8,
      minStockAlert: 2,
      hasSerialTracking: true,
    },
    {
      name: "Apple MacBook Air 13-inch M3 (16GB RAM, 512GB SSD, Midnight)",
      sku: "ELEC-MBA-M3-16",
      barcode: "195949000105",
      hsnCode: "847130",
      category: "Laptops",
      brand: "Apple",
      baseUnit: "PCS",
      purchasePrice: 118000,
      sellingPrice: 134900,
      mrp: 134900,
      gstRate: 18,
      currentStock: 6,
      minStockAlert: 1,
      hasSerialTracking: true,
    },
    {
      name: "Sony WH-1000XM5 Wireless Noise Canceling Headphones (Silver)",
      sku: "ELEC-SONY-XM5",
      barcode: "454873600103",
      hsnCode: "851830",
      category: "Audio",
      brand: "Sony",
      baseUnit: "PCS",
      purchasePrice: 22500,
      sellingPrice: 28990,
      mrp: 34990,
      gstRate: 18,
      currentStock: 14,
      minStockAlert: 3,
      hasSerialTracking: true,
    },
    {
      name: "Apple iPad Air 11-inch M2 128GB Wi-Fi (Starlight)",
      sku: "ELEC-IPAD-AIR-M2",
      barcode: "195949000106",
      hsnCode: "847130",
      category: "Tablets",
      brand: "Apple",
      baseUnit: "PCS",
      purchasePrice: 51000,
      sellingPrice: 59900,
      mrp: 59900,
      gstRate: 18,
      currentStock: 7,
      minStockAlert: 2,
      hasSerialTracking: true,
    },
  ];

  const productMap: Record<string, any> = {};

  for (const p of productsData) {
    let prod = await prisma.product.findFirst({
      where: { tenantId, sku: p.sku },
    });
    if (!prod) {
      prod = await prisma.product.create({
        data: { tenantId, ...p },
      });
    } else {
      prod = await prisma.product.update({
        where: { id: prod.id },
        data: { hasSerialTracking: true },
      });
    }
    productMap[p.sku] = prod;
  }

  // 2. Seed Realistic In-Stock DeviceUnits (Dual IMEI & Hardware Serials)
  const stockUnits = [
    {
      sku: "ELEC-IPH16P-128",
      imei1: "356938114920194",
      imei2: "356938114920195",
      serialNumber: "F2LX9029MD6R",
      color: "Natural Titanium",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-IPH16P-128",
      imei1: "356938114920202",
      imei2: "356938114920203",
      serialNumber: "F2LX9030MD6R",
      color: "Desert Titanium",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-IPH16P-128",
      imei1: "356938114920210",
      imei2: "356938114920211",
      serialNumber: "F2LX9031MD6R",
      color: "Black Titanium",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-S24U-256",
      imei1: "880609500102143",
      imei2: "880609500102144",
      serialNumber: "R5CW10A2B99X",
      color: "Titanium Gray",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-S24U-256",
      imei1: "880609500102150",
      imei2: "880609500102151",
      serialNumber: "R5CW10A2B100",
      color: "Titanium Violet",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-MBA-M3-16",
      imei1: "C02GN0ABMD6R001",
      imei2: null,
      serialNumber: "C02GN0ABMD6R",
      color: "Midnight",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-MBA-M3-16",
      imei1: "C02GN0ABMD6R002",
      imei2: null,
      serialNumber: "C02GN0ABMD6S",
      color: "Space Gray",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-SONY-XM5",
      imei1: "SN5019284001921",
      imei2: null,
      serialNumber: "S01-928400192",
      color: "Silver",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-SONY-XM5",
      imei1: "SN5019284001922",
      imei2: null,
      serialNumber: "S01-928400193",
      color: "Black",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-IPAD-AIR-M2",
      imei1: "358920194850121",
      imei2: null,
      serialNumber: "DMPM2029AIR1",
      color: "Starlight",
      warrantyMonths: 12,
      status: DeviceStatus.IN_STOCK,
    },
    {
      sku: "ELEC-S24U-256",
      imei1: "880609500102199",
      imei2: "880609500102200",
      serialNumber: "R5CW10A2B999",
      color: "Titanium Black",
      warrantyMonths: 12,
      status: DeviceStatus.DEFECTIVE, // Display line issue under RMA
    },
  ];

  for (const unit of stockUnits) {
    const prod = productMap[unit.sku];
    if (!prod) continue;

    await prisma.deviceUnit.upsert({
      where: {
        tenantId_imei1: {
          tenantId,
          imei1: unit.imei1,
        },
      },
      update: {
        productId: prod.id,
        imei2: unit.imei2,
        serialNumber: unit.serialNumber,
        color: unit.color,
        status: unit.status,
        warrantyMonths: unit.warrantyMonths,
      },
      create: {
        tenantId,
        productId: prod.id,
        imei1: unit.imei1,
        imei2: unit.imei2,
        serialNumber: unit.serialNumber,
        color: unit.color,
        status: unit.status,
        warrantyMonths: unit.warrantyMonths,
      },
    });
  }

  // 3. Seed Realistic Customer Invoices with Sold Devices & IMEIs printed
  const soldSales = [
    {
      invoiceNumber: "INV-2610-0101",
      customerName: "Rahul Sharma",
      customerPhone: "+91 98765 43210",
      paymentMode: PaymentMode.CARD,
      notes: "PineLabs HDFC Bank Credit Card 6-Month No-Cost EMI",
      item: {
        sku: "ELEC-IPH16P-128",
        imei1: "356938114920180",
        imei2: "356938114920181",
        serialNumber: "F2LX9028MD6R",
        color: "Natural Titanium",
        price: 119900,
      },
    },
    {
      invoiceNumber: "INV-2610-0102",
      customerName: "Anjali Pillai",
      customerPhone: "+91 98470 11223",
      paymentMode: PaymentMode.CREDIT,
      notes: "Bajaj Finserv Insta-EMI (0 Downpayment)",
      item: {
        sku: "ELEC-S24U-256",
        imei1: "880609500102100",
        imei2: "880609500102101",
        serialNumber: "R5CW10A2B088",
        color: "Titanium Gray",
        price: 129999,
      },
    },
    {
      invoiceNumber: "INV-2610-0103",
      customerName: "Karthik Menon",
      customerPhone: "+91 94471 22334",
      paymentMode: PaymentMode.UPI,
      notes: "UPI QR Dynamic Payment (Google Pay)",
      item: {
        sku: "ELEC-SONY-XM5",
        imei1: "SN5019284001900",
        imei2: null,
        serialNumber: "S01-928400188",
        color: "Silver",
        price: 28990,
      },
    },
    {
      invoiceNumber: "INV-2610-0104",
      customerName: "Priya Nair",
      customerPhone: "+91 98950 33445",
      paymentMode: PaymentMode.UPI,
      notes: "UPI QR Payment",
      item: {
        sku: "ELEC-IPAD-AIR-M2",
        imei1: "358920194850100",
        imei2: null,
        serialNumber: "DMPM2029AIR0",
        color: "Starlight",
        price: 59900,
      },
    },
  ];

  for (const sale of soldSales) {
    const prod = productMap[sale.item.sku];
    if (!prod) continue;

    // Check if invoice exists
    let invoice = await prisma.invoice.findFirst({
      where: { tenantId, invoiceNumber: sale.invoiceNumber },
    });

    const gstRate = 18;
    const baseTotal = sale.item.price;
    const taxableSubtotal = Math.round((baseTotal / (1 + gstRate / 100)) * 100) / 100;
    const cgst = Math.round(((taxableSubtotal * 9) / 100) * 100) / 100;
    const sgst = Math.round((baseTotal - taxableSubtotal - cgst) * 100) / 100;

    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          tenantId,
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          customerStateCode: "32",
          isInterState: false,
          subtotal: taxableSubtotal,
          cgstAmount: cgst,
          sgstAmount: sgst,
          totalTax: cgst + sgst,
          totalAmount: baseTotal,
          paidAmount: baseTotal,
          dueAmount: 0,
          paymentStatus: PaymentStatus.PAID,
          paymentMode: sale.paymentMode,
          notes: sale.notes,
        },
      });

      const invItem = await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: prod.id,
          productName: prod.name,
          hsnCode: prod.hsnCode,
          unitSold: "PCS",
          quantity: 1,
          baseQuantity: 1,
          unitPrice: taxableSubtotal,
          gstRate,
          cgstAmount: cgst,
          sgstAmount: sgst,
          imeiNumber: sale.item.imei1,
          lineTotal: baseTotal,
        },
      });

      // Upsert device as SOLD and link to invoiceItem
      await prisma.deviceUnit.upsert({
        where: {
          tenantId_imei1: {
            tenantId,
            imei1: sale.item.imei1,
          },
        },
        update: {
          productId: prod.id,
          imei2: sale.item.imei2,
          serialNumber: sale.item.serialNumber,
          color: sale.item.color,
          status: DeviceStatus.SOLD,
          invoiceItemId: invItem.id,
          soldAt: new Date(),
        },
        create: {
          tenantId,
          productId: prod.id,
          imei1: sale.item.imei1,
          imei2: sale.item.imei2,
          serialNumber: sale.item.serialNumber,
          color: sale.item.color,
          status: DeviceStatus.SOLD,
          invoiceItemId: invItem.id,
          soldAt: new Date(),
        },
      });
    }
  }

  console.log(`[AutoSeed] Finished seeding ElectroPulse electronics demo data.`);
}

// GET /api/electronics/devices
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Self-healing: if no devices exist for this tenant, seed them
    await ensureElectronicsDemoData(tenantId);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query = searchParams.get("q")?.trim();

    const where: any = { tenantId };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { imei1: { contains: query, mode: "insensitive" } },
        { imei2: { contains: query, mode: "insensitive" } },
        { serialNumber: { contains: query, mode: "insensitive" } },
        { color: { contains: query, mode: "insensitive" } },
        { product: { name: { contains: query, mode: "insensitive" } } },
        { product: { brand: { contains: query, mode: "insensitive" } } },
      ];
    }

    const [devices, totalUnits, inStockCount, soldCount, defectiveCount, invoices] = await Promise.all([
      prisma.deviceUnit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              brand: true,
              category: true,
              sellingPrice: true,
              mrp: true,
            },
          },
          invoiceItem: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  invoiceDate: true,
                  customerName: true,
                  customerPhone: true,
                  paymentMode: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      }),
      prisma.deviceUnit.count({ where: { tenantId } }),
      prisma.deviceUnit.count({ where: { tenantId, status: DeviceStatus.IN_STOCK } }),
      prisma.deviceUnit.count({ where: { tenantId, status: DeviceStatus.SOLD } }),
      prisma.deviceUnit.count({ where: { tenantId, status: DeviceStatus.DEFECTIVE } }),
      prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { invoiceDate: "desc" },
        take: 5,
        include: {
          items: {
            select: {
              productName: true,
              imeiNumber: true,
              lineTotal: true,
            },
          },
        },
      }),
    ]);

    // Calculate today's sales
    const todaySales = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalUnits,
        inStockCount,
        soldCount,
        defectiveCount,
        todaySales,
        recentInvoiceCount: invoices.length,
      },
      devices,
      recentInvoices: invoices,
    });
  } catch (error: any) {
    console.error("Error in GET /api/electronics/devices:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/electronics/devices - Inward / Register new DeviceUnit
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const body = await req.json();
    const { productId, imei1, imei2, serialNumber, color, warrantyMonths = 12 } = body;

    if (!productId || !imei1) {
      return NextResponse.json({ error: "Product and Primary IMEI are required" }, { status: 400 });
    }

    const cleanImei1 = String(imei1).trim();
    if (cleanImei1.length < 8) {
      return NextResponse.json({ error: "IMEI/Serial must be at least 8 characters" }, { status: 400 });
    }

    // Check duplicate
    const exists = await prisma.deviceUnit.findUnique({
      where: {
        tenantId_imei1: {
          tenantId,
          imei1: cleanImei1,
        },
      },
    });

    if (exists) {
      return NextResponse.json({ error: `Device with IMEI ${cleanImei1} is already registered.` }, { status: 409 });
    }

    const device = await prisma.deviceUnit.create({
      data: {
        tenantId,
        productId,
        imei1: cleanImei1,
        imei2: imei2 ? String(imei2).trim() : null,
        serialNumber: serialNumber ? String(serialNumber).trim() : null,
        color: color ? String(color).trim() : null,
        warrantyMonths: Number(warrantyMonths) || 12,
        status: DeviceStatus.IN_STOCK,
      },
      include: {
        product: true,
      },
    });

    // Increment product currentStock
    await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: { increment: 1 },
        hasSerialTracking: true,
      },
    });

    return NextResponse.json({ success: true, device });
  } catch (error: any) {
    console.error("Error in POST /api/electronics/devices:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
