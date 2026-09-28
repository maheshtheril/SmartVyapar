const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('accountId          String?  @unique') && c.includes('model Customer {')) {
  c = c.replace(
    /outstandingBalance Decimal  @default\(0.0\) @db.Decimal\(10, 2\).*?\n/,
    match => match + '  accountId          String?  @unique\n'
  );
  
  c = c.replace(
    /tenant              Tenant               @relation\(fields: \[tenantId\], references: \[id\], onDelete: Cascade\)\n/,
    match => match + '  account             Account?             @relation(fields: [accountId], references: [id])\n'
  );
  
  c = c.replace(
    /supplier Supplier\?/,
    'supplier Supplier?\n  customer Customer?'
  );
  
  fs.writeFileSync(p, c, 'utf8');
  console.log('Customer model updated with Account relation');
} else {
  console.log('Already updated or model not found');
}
