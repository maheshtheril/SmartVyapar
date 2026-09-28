const fs = require('fs');
let p = 'C:\\2035-HMS\\ZionaPOS\\src\\app\\api\\purchase\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const supplierLogic = `
      // Supplier Master & Chart of Accounts Auto-Link
      let finalSupplierId = null;
      if (supplierName) {
        // Try to find existing supplier
        let existingSupplier = await tx.supplier.findFirst({
          where: { tenantId, name: { equals: supplierName, mode: 'insensitive' } }
        });

        if (!existingSupplier) {
          // Create Accounts Payable Ledger
          const vendorAccount = await tx.account.create({
            data: {
              tenantId,
              code: \`AP-\${Date.now().toString().slice(-6)}\`,
              name: \`Vendor: \${supplierName}\`,
              classification: 'LIABILITY',
              balance: 0,
            }
          });

          // Create Supplier Master
          existingSupplier = await tx.supplier.create({
            data: {
              tenantId,
              name: supplierName,
              gstin: supplierGstin || null,
              accountId: vendorAccount.id
            }
          });
        } else if (supplierGstin && !existingSupplier.gstin) {
          // Update GSTIN if missing
          existingSupplier = await tx.supplier.update({
            where: { id: existingSupplier.id },
            data: { gstin: supplierGstin }
          });
        }
        finalSupplierId = existingSupplier.id;
      }
`;

// Insert it right before `// 1. Create Purchase Bill Header`
if (!c.includes('finalSupplierId')) {
  c = c.replace(/\/\/ 1\. Create Purchase Bill Header/, supplierLogic + '\n      // 1. Create Purchase Bill Header');
}

// Modify `tx.purchaseBill.create` to include `supplierId: finalSupplierId`
if (c.includes('billNumber,')) {
  c = c.replace(/billNumber,/, 'billNumber,\n            supplierId: finalSupplierId,');
}

fs.writeFileSync(p, c, 'utf8');
console.log('API Updated');
