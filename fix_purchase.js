const fs = require('fs');
const path = 'src/app/api/purchase/[id]/route.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `// Clean up orphaned products
      for (const item of bill.items) {
        if (!item.productId) continue;
        const otherUses = await tx.purchaseBillItem.count({ where: { productId: item.productId } });
        const salesUses = await tx.invoiceItem.count({ where: { productId: item.productId } });
        if (otherUses === 0 && salesUses === 0) {
          await tx.product.delete({ where: { id: item.productId } });
        }
      }`,
  `// (Removed auto-delete of orphaned products to prevent FK transaction aborts)`
);

fs.writeFileSync(path, c);
console.log("Updated");
