import { PrismaClient, UserRole, PaymentStatus, PaymentMode, StockLogType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SmartVyapar Multi-Tenant Database...");

  // 1. Create Sample Tenant (Shop in Kerala)
  const tenant = await prisma.tenant.upsert({
    where: { slug: "ziona-electricals" },
    update: {},
    create: {
      slug: "ziona-electricals",
      businessName: "Ziona Tech & Electricals",
      legalName: "Ziona Solutions Pvt Ltd",
      gstin: "32AAAAA0000A1Z5",
      stateCode: "32",
      stateName: "Kerala",
      upiId: "zionabusiness@icici",
      phone: "9876543210",
      email: "contact@ziona.in",
      address: "Main Highway Road, Calicut, Kerala - 673001",
      isComposition: false,
      currency: "INR",
    },
  });

  console.log(`✅ Tenant Created: ${tenant.businessName} (ID: ${tenant.id})`);

  // 2. Create Owner User
  const passwordHash = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@ziona.in" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Mahesh (Owner)",
      email: "admin@ziona.in",
      phone: "9876543210",
      passwordHash,
      role: UserRole.OWNER,
    },
  });

  console.log(`✅ Owner User Created: ${user.name} (${user.email})`);

  // 3. Create Sample Products & Initial Stock
  const p1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Havells 1.5 Sq.mm Copper Wire (90m)",
      sku: "HAV-WIRE-15",
      barcode: "8901234567890",
      hsnCode: "8544",
      category: "Wires & Cables",
      baseUnit: "COIL",
      purchasePrice: 1200.0,
      sellingPrice: 1650.0,
      mrp: 1850.0,
      gstRate: 18.0,
      currentStock: 25,
      minStockAlert: 5,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Syska 12W LED Bulb (Cool Day)",
      sku: "SYS-LED-12W",
      barcode: "8901234567891",
      hsnCode: "8539",
      category: "Lighting",
      baseUnit: "PCS",
      purchasePrice: 85.0,
      sellingPrice: 140.0,
      mrp: 170.0,
      gstRate: 12.0,
      currentStock: 4, // Low stock!
      minStockAlert: 5,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Anchor Roma 16A Modular Switch",
      sku: "ANC-SW-16A",
      barcode: "8901234567892",
      hsnCode: "8536",
      category: "Switches",
      baseUnit: "PCS",
      purchasePrice: 55.0,
      sellingPrice: 85.0,
      mrp: 110.0,
      gstRate: 18.0,
      currentStock: 65,
      minStockAlert: 10,
    },
  });

  console.log(`✅ 3 Products & Stock Created!`);

  // 4. Initial Stock Logs
  await prisma.stockLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        productId: p1.id,
        changeQty: 25,
        type: StockLogType.INITIAL,
        note: "Initial warehouse opening stock",
      },
      {
        tenantId: tenant.id,
        productId: p2.id,
        changeQty: 4,
        type: StockLogType.INITIAL,
        note: "Initial warehouse opening stock",
      },
      {
        tenantId: tenant.id,
        productId: p3.id,
        changeQty: 65,
        type: StockLogType.INITIAL,
        note: "Initial warehouse opening stock",
      },
    ],
  });

  // 5. Create Sample Customer
  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: "Anil Kumar (Contractor)",
      phone: "9876543210",
      stateCode: "32",
      address: "Civil Station, Calicut",
      outstandingBalance: 2389.6,
    },
  });

  // 6. Create First Sample Invoice
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      invoiceNumber: "INV-2026-0001",
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerStateCode: "32",
      isInterState: false,
      subtotal: 3720.0,
      cgstAmount: 334.8,
      sgstAmount: 334.8,
      igstAmount: 0.0,
      totalTax: 669.6,
      totalAmount: 4389.6,
      paidAmount: 2000.0,
      dueAmount: 2389.6,
      paymentStatus: PaymentStatus.PARTIAL,
      paymentMode: PaymentMode.UPI,
      upiUri: `upi://pay?pa=zionabusiness@icici&pn=Ziona%20Tech&am=2389.60&cu=INR&tn=Invoice%20INV-2026-0001`,
      items: {
        create: [
          {
            productId: p1.id,
            productName: p1.name,
            hsnCode: p1.hsnCode,
            quantity: 2,
            unitPrice: p1.sellingPrice,
            gstRate: p1.gstRate,
            cgstAmount: 297.0,
            sgstAmount: 297.0,
            igstAmount: 0.0,
            lineTotal: 3300.0,
          },
          {
            productId: p2.id,
            productName: p2.name,
            hsnCode: p2.hsnCode,
            quantity: 3,
            unitPrice: p2.sellingPrice,
            gstRate: p2.gstRate,
            cgstAmount: 25.2,
            sgstAmount: 25.2,
            igstAmount: 0.0,
            lineTotal: 420.0,
          },
        ],
      },
    },
  });

  console.log(`✅ Sample Invoice Created: ${invoice.invoiceNumber} (Total: ₹${invoice.totalAmount}, Due: ₹${invoice.dueAmount})`);
  console.log("🎉 Seed Finished Successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
