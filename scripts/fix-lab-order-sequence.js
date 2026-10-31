const fs = require('fs');

// 1. Update src/app/api/lab/orders/route.ts with collision-free sequence generator
let routeCode = fs.readFileSync('src/app/api/lab/orders/route.ts', 'utf8').replace(/\r\n/g, '\n');

const oldOrderSeqTarget = `    // Generate unique order number (e.g. LAB-2610-XXXX)
    const today = new Date();
    const yearMonth = today.toISOString().slice(2, 7).replace("-", ""); // e.g. "2610"
    const countToday = await prisma.labOrder.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const orderNumber = \`LAB-\${yearMonth}-\${String(countToday + 1).padStart(4, "0")}\`;

    // Generate unique tube sample barcode (e.g. SMP-XXXXXXX)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const sampleBarcode = \`SMP-\${randomSuffix}\`;`;

const newOrderSeqReplacement = `    // Generate guaranteed collision-free order number (e.g. LAB-2610-XXXX)
    const today = new Date();
    const yearMonth = today.toISOString().slice(2, 7).replace("-", ""); // e.g. "2610"
    
    // Find the latest order with this prefix for the tenant
    const latestOrder = await prisma.labOrder.findFirst({
      where: {
        tenantId,
        orderNumber: { startsWith: \`LAB-\${yearMonth}-\` },
      },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    let nextSeq = 1;
    if (latestOrder?.orderNumber) {
      const parts = latestOrder.orderNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    let orderNumber = \`LAB-\${yearMonth}-\${String(nextSeq).padStart(4, "0")}\`;

    // Safety check to ensure absolute uniqueness
    let existingOrder = await prisma.labOrder.findUnique({
      where: {
        tenantId_orderNumber: { tenantId, orderNumber },
      },
    });
    while (existingOrder) {
      nextSeq++;
      orderNumber = \`LAB-\${yearMonth}-\${String(nextSeq).padStart(4, "0")}\`;
      existingOrder = await prisma.labOrder.findUnique({
        where: {
          tenantId_orderNumber: { tenantId, orderNumber },
        },
      });
    }

    // Generate guaranteed unique tube sample barcode (e.g. SMP-XXXXXXX)
    let sampleBarcode = \`SMP-\${Math.floor(100000 + Math.random() * 900000)}\`;
    let barcodeExists = await prisma.labOrder.findFirst({
      where: { tenantId, sampleBarcode },
    });
    while (barcodeExists) {
      sampleBarcode = \`SMP-\${Math.floor(100000 + Math.random() * 900000)}\`;
      barcodeExists = await prisma.labOrder.findFirst({
        where: { tenantId, sampleBarcode },
      });
    }`;

if (routeCode.includes(oldOrderSeqTarget)) {
  routeCode = routeCode.replace(oldOrderSeqTarget, newOrderSeqReplacement);
  fs.writeFileSync('src/app/api/lab/orders/route.ts', routeCode, 'utf8');
  console.log('src/app/api/lab/orders/route.ts updated with collision-free sequence generator');
} else {
  console.error('oldOrderSeqTarget not found in src/app/api/lab/orders/route.ts');
}

// 2. Update src/app/(app)/lab/page.tsx to automatically trigger barcode popup on success
let pageCode = fs.readFileSync('src/app/(app)/lab/page.tsx', 'utf8').replace(/\r\n/g, '\n');

const oldSuccessTarget = `        setTestSearchQuery('');
        setSelectedDepartment('ALL');
        loadData();
      } else {`;

const newSuccessReplacement = `        setTestSearchQuery('');
        setSelectedDepartment('ALL');
        loadData();
        if (data.order) {
          setBarcodeModalOrder(data.order);
        }
      } else {`;

if (pageCode.includes(oldSuccessTarget)) {
  pageCode = pageCode.replace(oldSuccessTarget, newSuccessReplacement);
  fs.writeFileSync('src/app/(app)/lab/page.tsx', pageCode, 'utf8');
  console.log('src/app/(app)/lab/page.tsx updated to auto-show barcode sticker on creation');
} else {
  console.error('oldSuccessTarget not found in src/app/(app)/lab/page.tsx');
}
