import { PrismaClient, UserRole, PaymentStatus, PaymentMode, StockLogType, AccountClassification, VoucherType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function connectWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log("Connected to Neon DB successfully.");
      return;
    } catch (err: any) {
      console.log(`Connection attempt ${i + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
      if (i === retries - 1) throw err;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

async function main() {
  await connectWithRetry();
  console.log("🚗 Seeding Automobile Industry Demo Tenant & Master Data...");

  // 1. Create Automobile Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "apex-motors" },
    update: {
      subscriptionTier: "PRO",
      subscriptionStatus: "ACTIVE",
      businessType: "AUTOMOBILE",
    },
    create: {
      slug: "apex-motors",
      businessName: "Apex Motors & Auto Spares",
      legalName: "Apex Automotive Care & Spares Pvt Ltd",
      gstin: "32AAACA5678F1Z9",
      stateCode: "32",
      stateName: "Kerala",
      upiId: "apexmotors@hdfcbank",
      phone: "9847012345",
      email: "apexmotors@smartvyapar.com",
      address: "NH 66 Express Highway, Edappally, Kochi, Kerala - 682024",
      pincode: "682024",
      businessType: "AUTOMOBILE",
      isComposition: false,
      currency: "INR",
      subscriptionTier: "PRO",
      subscriptionStatus: "ACTIVE",
    },
  });

  console.log(`✅ Tenant Created: ${tenant.businessName} (${tenant.slug})`);

  // 2. Create Owner User
  const passwordHash = await bcrypt.hash("ApexAuto@2026", 10);
  const user = await prisma.user.upsert({
    where: { email: "apexmotors@smartvyapar.com" },
    update: {
      passwordHash,
      role: UserRole.OWNER,
    },
    create: {
      tenantId: tenant.id,
      name: "Rajesh Menon (Managing Director)",
      email: "apexmotors@smartvyapar.com",
      phone: "9847012345",
      passwordHash,
      role: UserRole.OWNER,
    },
  });

  console.log(`✅ Owner User Created: ${user.name} (${user.email}) | Password: ApexAuto@2026`);

  // 3. Create Multi-Warehouses
  const whCentral = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "WH-CENTRAL" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "WH-CENTRAL",
      name: "Central Auto Spares Godown",
      address: "Building A, Racks 1-10, NH 66",
      city: "Kochi",
      isDefault: true,
    },
  });

  const whBay = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "WH-BAY" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "WH-BAY",
      name: "Workshop Service Bay Storage",
      address: "Service Bay Hoist 1-4",
      city: "Kochi",
      isDefault: false,
    },
  });

  console.log(`✅ Warehouses created: ${whCentral.name}, ${whBay.name}`);

  // 4. Create Customers (Retail & Fleet Khata)
  const fleetCustomer = await prisma.customer.upsert({
    where: { id: "cust-fleet-001" },
    update: { tenantId: tenant.id },
    create: {
      id: "cust-fleet-001",
      tenantId: tenant.id,
      name: "Kerala Fleet Taxi Operators Co-op",
      phone: "9847112233",
      email: "keralataxi.fleet@gmail.com",
      gstin: "32AAAK1122D1Z0",
      stateCode: "32",
      address: "Marine Drive Transport Hub, Kochi",
      pincode: "682031",
      outstandingBalance: 14500.0,
    },
  });

  const retailCustomer = await prisma.customer.upsert({
    where: { id: "cust-retail-002" },
    update: { tenantId: tenant.id },
    create: {
      id: "cust-retail-002",
      tenantId: tenant.id,
      name: "Arun Varma (Hyundai Creta KL-07-CD-1234)",
      phone: "9847223344",
      email: "arun.varma@outlook.com",
      stateCode: "32",
      address: "Panampilly Nagar, Kochi",
      pincode: "682036",
      outstandingBalance: 0.0,
    },
  });

  console.log(`✅ Customers created: ${fleetCustomer.name}, ${retailCustomer.name}`);

  // 5. Create Auto Spares & Labor Services Catalog
  const products = [
    {
      name: "Castrol EDGE 5W-40 Fully Synthetic Engine Oil (4L)",
      sku: "OIL-CAS-5W40",
      barcode: "8901030012345",
      hsnCode: "2710",
      category: "Lubricants & Fluids",
      baseUnit: "CAN",
      purchasePrice: 2200.0,
      sellingPrice: 3100.0,
      mrp: 3450.0,
      gstRate: 18.0,
      currentStock: 45.0,
      minStockAlert: 10.0,
    },
    {
      name: "Bosch QuietCast Front Ceramic Brake Pads (Set of 4)",
      sku: "BRK-BOS-QC01",
      barcode: "8901030023456",
      hsnCode: "8708",
      category: "Braking System",
      baseUnit: "SET",
      purchasePrice: 1400.0,
      sellingPrice: 2250.0,
      mrp: 2600.0,
      gstRate: 28.0,
      currentStock: 28.0,
      minStockAlert: 8.0,
    },
    {
      name: "NGK Laser Iridium Long-Life Spark Plug",
      sku: "IGN-NGK-IR04",
      barcode: "8901030034567",
      hsnCode: "8511",
      category: "Ignition & Electrical",
      baseUnit: "PCS",
      purchasePrice: 380.0,
      sellingPrice: 650.0,
      mrp: 750.0,
      gstRate: 28.0,
      currentStock: 60.0,
      minStockAlert: 15.0,
    },
    {
      name: "Mann Filter Micro-Particle Spin-On Oil Filter",
      sku: "FLT-MAN-W712",
      barcode: "8901030045678",
      hsnCode: "8421",
      category: "Filters",
      baseUnit: "PCS",
      purchasePrice: 250.0,
      sellingPrice: 480.0,
      mrp: 550.0,
      gstRate: 18.0,
      currentStock: 50.0,
      minStockAlert: 12.0,
    },
    {
      name: "Valeo Premium Heavy Duty Clutch Disc & Pressure Plate Kit",
      sku: "CLT-VAL-HD88",
      barcode: "8901030056789",
      hsnCode: "8708",
      category: "Transmission",
      baseUnit: "KIT",
      purchasePrice: 4800.0,
      sellingPrice: 7200.0,
      mrp: 8100.0,
      gstRate: 28.0,
      currentStock: 12.0,
      minStockAlert: 4.0,
    },
    {
      name: "Exide Matrix Red 12V 45Ah Maintenance-Free Car Battery",
      sku: "BAT-EXI-MT45",
      barcode: "8901030067890",
      hsnCode: "8507",
      category: "Batteries",
      baseUnit: "PCS",
      purchasePrice: 3900.0,
      sellingPrice: 5600.0,
      mrp: 6200.0,
      gstRate: 28.0,
      currentStock: 16.0,
      minStockAlert: 5.0,
    },
    {
      name: "Periodic Major Maintenance Service (PMS) Labor Package",
      sku: "SRV-PMS-LAB01",
      barcode: "99870001",
      hsnCode: "9987",
      category: "Workshop Labor",
      baseUnit: "JOB",
      purchasePrice: 0.0,
      sellingPrice: 1800.0,
      mrp: 2000.0,
      gstRate: 18.0,
      currentStock: 999.0,
      minStockAlert: 0.0,
    },
    {
      name: "Computerized 4-Wheel Laser Alignment & 3D Balancing",
      sku: "SRV-ALN-3D02",
      barcode: "99870002",
      hsnCode: "9987",
      category: "Workshop Labor",
      baseUnit: "JOB",
      purchasePrice: 0.0,
      sellingPrice: 950.0,
      mrp: 1100.0,
      gstRate: 18.0,
      currentStock: 999.0,
      minStockAlert: 0.0,
    },
  ];

  const createdProducts: any[] = [];
  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { tenantId: tenant.id, sku: p.sku },
    });

    if (existing) {
      createdProducts.push(existing);
    } else {
      const prod = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          ...p,
        },
      });
      createdProducts.push(prod);
    }
  }

  console.log(`✅ Created ${createdProducts.length} Auto Spares & Services in catalog`);

  // 6. Create Batches for FIFO Tracking
  const oilProd = createdProducts.find((p) => p.sku === "OIL-CAS-5W40");
  if (oilProd) {
    await prisma.batch.upsert({
      where: { id: "batch-oil-01" },
      update: {},
      create: {
        id: "batch-oil-01",
        tenantId: tenant.id,
        productId: oilProd.id,
        batchNumber: "CAS-2026-08A",
        mfgDate: new Date("2026-01-15"),
        expiryDate: new Date("2029-01-15"),
        costPrice: 2200.0,
        sellingPrice: 3100.0,
        mrp: 3450.0,
        currentStock: 30.0,
      },
    });
  }

  // 7. Seed Chart of Accounts for Automobile Business
  const autoAccounts = [
    // 1. ASSETS
    { code: "1000", name: "Workshop Counter Cash in Hand", classification: AccountClassification.ASSET, balance: 28450.0 },
    { code: "1010", name: "HDFC Bank Auto Current Account", classification: AccountClassification.ASSET, balance: 184600.0 },
    { code: "1020", name: "UPI Settlement Account", classification: AccountClassification.ASSET, balance: 0 },
    { code: "1030", name: "Card Settlement Account", classification: AccountClassification.ASSET, balance: 0 },
    { code: "1200", name: "Accounts Receivable (Fleet Dues & Khata)", classification: AccountClassification.ASSET, balance: 14500.0 },
    { code: "1300", name: "Auto Spare Parts & Fluids Inventory", classification: AccountClassification.ASSET, balance: 118400.0 },
    { code: "1410", name: "Input Tax Credit - CGST (Purchases)", classification: AccountClassification.ASSET, balance: 6450.0 },
    { code: "1420", name: "Input Tax Credit - SGST (Purchases)", classification: AccountClassification.ASSET, balance: 6450.0 },
    { code: "1500", name: "Workshop Hydraulic Lifts & 3D Aligners", classification: AccountClassification.ASSET, balance: 250000.0 },

    // 2. LIABILITIES
    { code: "2000", name: "Accounts Payable (Bosch & Castrol Distributors)", classification: AccountClassification.LIABILITY, balance: 42000.0 },
    { code: "2200", name: "Output CGST Payable (Statutory GST)", classification: AccountClassification.LIABILITY, balance: 2840.0 },
    { code: "2201", name: "Output SGST Payable (Statutory GST)", classification: AccountClassification.LIABILITY, balance: 2840.0 },

    // 3. EQUITY
    { code: "3000", name: "Owner's Equity & Capital", classification: AccountClassification.EQUITY, balance: 450000.0 },
    { code: "3100", name: "Retained Earnings & Reserves", classification: AccountClassification.EQUITY, balance: 50000.0 },

    // 4. REVENUE
    { code: "4000", name: "Sales Revenue (Spare Parts & Fluids)", classification: AccountClassification.REVENUE, balance: 88500.0 },
    { code: "4100", name: "Workshop Mechanical Labor & Service Income", classification: AccountClassification.REVENUE, balance: 24200.0 },
    { code: "4200", name: "Supplier Cash Discounts Received", classification: AccountClassification.REVENUE, balance: 1800.0 },

    // 5. EXPENSES
    { code: "5000", name: "Cost of Goods Sold (Spare Parts Cost)", classification: AccountClassification.EXPENSE, balance: 52000.0 },
    { code: "5100", name: "Workshop Bay Rent & Property Tax", classification: AccountClassification.EXPENSE, balance: 25000.0 },
    { code: "5200", name: "Electricity & Industrial Compressor Power", classification: AccountClassification.EXPENSE, balance: 4800.0 },
    { code: "5300", name: "Technicians & Mechanics Salaries", classification: AccountClassification.EXPENSE, balance: 35000.0 },
    { code: "5400", name: "Logistics & Express Parts Delivery", classification: AccountClassification.EXPENSE, balance: 1980.0 },
  ];

  for (const acc of autoAccounts) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: acc.code } },
      update: {
        name: acc.name,
        classification: acc.classification,
        balance: acc.balance,
      },
      create: {
        tenantId: tenant.id,
        code: acc.code,
        name: acc.name,
        classification: acc.classification,
        balance: acc.balance,
      },
    });
  }

  console.log(`✅ Seeded ${autoAccounts.length} Chart of Accounts for Automobile Business`);

  // 8. Create Sample Journal Vouchers (PV, RV, CV, JV)
  const cashAcc = await prisma.account.findUnique({ where: { tenantId_code: { tenantId: tenant.id, code: "1000" } } });
  const bankAcc = await prisma.account.findUnique({ where: { tenantId_code: { tenantId: tenant.id, code: "1010" } } });
  const rentAcc = await prisma.account.findUnique({ where: { tenantId_code: { tenantId: tenant.id, code: "5100" } } });
  const recvAcc = await prisma.account.findUnique({ where: { tenantId_code: { tenantId: tenant.id, code: "1200" } } });

  if (cashAcc && bankAcc && rentAcc && recvAcc) {
    // 1. Payment Voucher (PV) - Rent Payment
    const pv = await prisma.journalEntry.upsert({
      where: { tenantId_voucherNumber: { tenantId: tenant.id, voucherNumber: "PV-2026-0001" } },
      update: {},
      create: {
        tenantId: tenant.id,
        voucherNumber: "PV-2026-0001",
        voucherType: VoucherType.PAYMENT,
        date: new Date(),
        narration: "Workshop Bay Rent payment for NH66 premises via HDFC Bank Net Banking",
        referenceNo: "UTR-HDFC98217382",
        totalAmount: 25000.0,
        lines: {
          create: [
            { accountId: rentAcc.id, debit: 25000.0, credit: 0.0, narration: "Workshop Bay Rent debit" },
            { accountId: bankAcc.id, debit: 0.0, credit: 25000.0, narration: "HDFC Bank credit payout" },
          ],
        },
      },
    });

    // 2. Receipt Voucher (RV) - Fleet Khata Advance
    const rv = await prisma.journalEntry.upsert({
      where: { tenantId_voucherNumber: { tenantId: tenant.id, voucherNumber: "RV-2026-0001" } },
      update: {},
      create: {
        tenantId: tenant.id,
        voucherNumber: "RV-2026-0001",
        voucherType: VoucherType.RECEIPT,
        date: new Date(),
        narration: "Advance payment received from Kerala Fleet Taxi Co-op via UPI",
        referenceNo: "UPI-REF-99281726",
        totalAmount: 15000.0,
        lines: {
          create: [
            { accountId: bankAcc.id, debit: 15000.0, credit: 0.0, narration: "HDFC Bank deposit via UPI" },
            { accountId: recvAcc.id, debit: 0.0, credit: 15000.0, narration: "Fleet Khata credit settlement" },
          ],
        },
      },
    });

    // 3. Contra Voucher (CV) - Counter Cash to Bank Deposit
    const cv = await prisma.journalEntry.upsert({
      where: { tenantId_voucherNumber: { tenantId: tenant.id, voucherNumber: "CV-2026-0001" } },
      update: {},
      create: {
        tenantId: tenant.id,
        voucherNumber: "CV-2026-0001",
        voucherType: VoucherType.CONTRA,
        date: new Date(),
        narration: "Workshop Counter Cash deposit to HDFC Current Account via CDM",
        referenceNo: "CDM-DEP-00291",
        totalAmount: 12000.0,
        lines: {
          create: [
            { accountId: bankAcc.id, debit: 12000.0, credit: 0.0, narration: "Bank account debited" },
            { accountId: cashAcc.id, debit: 0.0, credit: 12000.0, narration: "Counter cash credited" },
          ],
        },
      },
    });

    console.log(`✅ Seeded Vouchers: ${pv.voucherNumber}, ${rv.voucherNumber}, ${cv.voucherNumber}`);
  }

  // 9. Create Sample GST Tax Invoice with E-Invoice IRN and Signed QR
  const invNumber = "INV-2026-0001";
  const existingInv = await prisma.invoice.findFirst({
    where: { tenantId: tenant.id, invoiceNumber: invNumber },
  });

  if (!existingInv) {
    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        invoiceNumber: invNumber,
        invoiceDate: new Date(),
        customerId: fleetCustomer.id,
        customerName: fleetCustomer.name,
        customerPhone: fleetCustomer.phone,
        customerGstin: fleetCustomer.gstin,
        customerStateCode: "32",
        isInterState: false,
        subtotal: 9200.0,
        cgstAmount: 984.0,
        sgstAmount: 984.0,
        igstAmount: 0.0,
        totalTax: 1968.0,
        totalAmount: 11168.0,
        paymentStatus: PaymentStatus.PAID,
        paymentMode: PaymentMode.UPI,
        paidAmount: 11168.0,
        dueAmount: 0.0,
        irn: "9f8b4a2e1d7c3b5a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0a1b",
        signedQrCode: "APEX:INV-2026-0001:32AAACA5678F1Z9:32AAAK1122D1Z0:11168.00:IRN9F8B4A2E",
        ackNo: "1126900481239845",
        ackDate: new Date(),
        items: {
          create: [
            {
              productName: "Castrol EDGE 5W-40 Fully Synthetic Engine Oil (4L)",
              productId: createdProducts[0]?.id,
              hsnCode: "2710",
              quantity: 2.0,
              unitSold: "CAN",
              unitPrice: 3100.0,
              gstRate: 18.0,
              cgstAmount: 558.0,
              sgstAmount: 558.0,
              igstAmount: 0.0,
              lineTotal: 7316.0,
            },
            {
              productName: "Periodic Major Maintenance Service (PMS) Labor Package",
              productId: createdProducts[6]?.id,
              hsnCode: "9987",
              quantity: 1.0,
              unitSold: "JOB",
              unitPrice: 1800.0,
              gstRate: 18.0,
              cgstAmount: 162.0,
              sgstAmount: 162.0,
              igstAmount: 0.0,
              lineTotal: 2124.0,
            },
            {
              productName: "Computerized 4-Wheel Laser Alignment & 3D Balancing",
              productId: createdProducts[7]?.id,
              hsnCode: "9987",
              quantity: 1.0,
              unitSold: "JOB",
              unitPrice: 950.0,
              gstRate: 18.0,
              cgstAmount: 85.5,
              sgstAmount: 85.5,
              igstAmount: 0.0,
              lineTotal: 1121.0,
            },
          ],
        },
      },
    });
    console.log(`✅ Created Sample GST Tax Invoice: ${invNumber} with IRN & Signed QR`);
  }

  // 10. Create Stock Transfer with Goods Delivery Challan
  const transferNumber = "ST-2026-0001";
  const existingTransfer = await prisma.stockTransfer.findFirst({
    where: { tenantId: tenant.id, transferNumber },
  });

  if (!existingTransfer && oilProd) {
    await prisma.stockTransfer.create({
      data: {
        tenantId: tenant.id,
        transferNumber,
        fromWarehouseId: whCentral.id,
        toWarehouseId: whBay.id,
        status: "RECEIVED",
        dispatchDate: new Date(),
        receivedDate: new Date(),
        vehicleNo: "KL-07-BX-8821",
        driverName: "Suresh Kumar",
        notes: "Daily parts replenishment for workshop service bays 1 through 4",
        items: {
          create: [
            {
              productId: oilProd.id,
              productName: oilProd.name,
              quantity: 5.0,
              unit: "CAN",
            },
          ],
        },
      },
    });
    console.log(`✅ Created Goods Delivery Challan Transfer: ${transferNumber}`);
  }

  console.log("\n=======================================================");
  console.log("🎉 AUTOMOBILE INDUSTRY DEMO SETUP COMPLETE!");
  console.log("-------------------------------------------------------");
  console.log("Business Name : Apex Motors & Auto Spares");
  console.log("Portal Login  : https://smartvyapar.vercel.app/login");
  console.log("Email         : apexmotors@smartvyapar.com");
  console.log("Password      : ApexAuto@2026");
  console.log("Role          : OWNER (Full Enterprise Access)");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
