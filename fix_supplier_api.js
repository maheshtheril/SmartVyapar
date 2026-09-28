const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\suppliers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

// Add to GET
c = c.replace(/orderBy: \{ name: 'asc' \}/, "orderBy: { name: 'asc' }, select: { id: true, name: true, gstin: true, phone: true, email: true, address: true, isActive: true, outstandingBalance: true, openingBalanceDate: true, _count: { select: { purchaseBills: true } } }");

// Update POST
const newPost = `const { name, gstin, phone, email, address, openingBalance, openingBalanceDate } = body;

    if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const vendorAccount = await tx.account.create({
        data: {
          tenantId,
          code: \`AP-\${Date.now().toString().slice(-6)}\`,
          name: \`Vendor: \${name}\`,
          classification: 'LIABILITY',
          balance: parseFloat(openingBalance) || 0,
        }
      });

      const newSupplier = await tx.supplier.create({
        data: {
          tenantId,
          name,
          gstin: gstin || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          accountId: vendorAccount.id,
          outstandingBalance: parseFloat(openingBalance) || 0,
          ...(openingBalanceDate !== undefined && { openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null })
        }
      });`;
c = c.replace(/const \{ name, gstin, phone, email, address \} = body;[\s\S]*?accountId: vendorAccount\.id\n\s*\}\n\s*\}\);/, newPost);

// Update PUT
const newPut = `const { id, name, gstin, phone, email, address, isActive, outstandingBalance, openingBalanceDate } = body;

    if (!id || !name) return NextResponse.json({ success: false, error: "ID and Name are required" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.update({
        where: { id, tenantId },
        data: {
          name,
          gstin: gstin || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          isActive: isActive !== undefined ? isActive : true,
          ...(openingBalanceDate !== undefined && { openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null }),
          ...(outstandingBalance !== undefined && { outstandingBalance: parseFloat(outstandingBalance) || 0 })
        }
      });
      if (outstandingBalance !== undefined && supplier.accountId) {
        await tx.account.update({
          where: { id: supplier.accountId },
          data: { balance: parseFloat(outstandingBalance) || 0 }
        });
      }
      return supplier;
    });`;
c = c.replace(/const \{ id, name, gstin, phone, email, address, isActive \} = body;[\s\S]*?isActive: isActive !== undefined \? isActive : true\n\s*\}\n\s*\}\);/, newPut);

fs.writeFileSync(p, c, 'utf8');
console.log('Supplier API updated');
