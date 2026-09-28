const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/model Supplier \{[\s\S]*?isActive  Boolean @default\(true\)/, `model Supplier {
  id        String  @id @default(uuid())
  tenantId  String
  name      String
  gstin     String?
  phone     String?
  email     String?
  address   String?
  accountId String? @unique
  isActive  Boolean @default(true)
  outstandingBalance Decimal  @default(0.0) @db.Decimal(10, 2)
  openingBalanceDate DateTime?`);

fs.writeFileSync(p, c, 'utf8');
console.log('Supplier schema updated');
