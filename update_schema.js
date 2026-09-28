const fs = require('fs');
let p = 'C:\\2035-HMS\\ZionaPOS\\prisma\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('model Supplier')) {
  const supplierModel = `
model Supplier {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  gstin     String?
  phone     String?
  email     String?
  address   String?
  accountId String?  @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account   Account? @relation(fields: [accountId], references: [id])
  purchaseBills PurchaseBill[]

  @@map("suppliers")
}
`;
  c = c + supplierModel;
}

if (!c.includes('supplier          Supplier?')) {
  c = c.replace(/model PurchaseBill \{/, 'model PurchaseBill {\n  supplierId        String?\n  supplier          Supplier? @relation(fields: [supplierId], references: [id])');
}

if (!c.includes('supplier Supplier?')) {
  c = c.replace(/model Account \{[\s\S]*?@@map\("accounts"\)\n\}/, (match) => {
    return match.replace(/@@map\("accounts"\)/, 'supplier Supplier?\n  @@map("accounts")');
  });
}

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed schema');
