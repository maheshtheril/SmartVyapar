const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

// 1. Add territories to Tenant
if (!c.includes('territories           Territory[]')) {
    c = c.replace(/customers             Customer\[\]\n/, 'customers             Customer[]\n    territories           Territory[]\n');
}

// 2. Add Territory model
const territoryModel = `
model Territory {
  id          String     @id @default(uuid())
  tenantId    String
  name        String     // e.g., "Kochi Central" or "Route A"
  zone        String?    // e.g., "South Zone"
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  tenant      Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customers   Customer[]

  @@index([tenantId])
  @@map("territories")
}
`;
if (!c.includes('model Territory {')) {
    c = c.replace(/\/\/ 5\. CUSTOMERS & KHATA \(CREDIT LEDGER\)\n\/\/ ----------------------------------------------------/, `// 5. CUSTOMERS & KHATA (CREDIT LEDGER)\n// ----------------------------------------------------\n${territoryModel}\n`);
}

// 3. Add territoryId to Customer
if (!c.includes('territoryId        String?')) {
    c = c.replace(/pincode            String\?  @default\("682001"\)\n/, 'pincode            String?  @default("682001")\n    territoryId        String?\n');
    c = c.replace(/account             Account\?             @relation\(fields: \[accountId\], references: \[id\]\)\n/, 'account             Account?             @relation(fields: [accountId], references: [id])\n    territory           Territory?           @relation(fields: [territoryId], references: [id], onDelete: SetNull)\n');
}

fs.writeFileSync(p, c, 'utf8');
console.log('Schema updated with Territory master');
