const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

// 1. Add enableTerritory to Tenant
c = c.replace(/currency           String           @default\("INR"\)/, 'currency           String           @default("INR")\n    enableTerritory    Boolean          @default(false) // Toggle for FMCG Region/Zone hierarchy');

// 2. Remove old Territory
c = c.replace(/model Territory \{[\s\S]*?@@map\("territories"\)\n\}\n/g, '');
c = c.replace(/territories           Territory\[\]\n/g, '');

// 3. Update Customer relation from old Territory
c = c.replace(/territoryId        String\?\n    account             Account\?             @relation\(fields: \[accountId\], references: \[id\]\)\n    territory           Territory\?           @relation\(fields: \[territoryId\], references: \[id\], onDelete: SetNull\)/, 'account             Account?             @relation(fields: [accountId], references: [id])\n    regionId           String?\n    zoneId             String?\n    territoryId        String?\n    beatId             String?\n\n    region             Region?              @relation(fields: [regionId], references: [id], onDelete: SetNull)\n    zone               Zone?                @relation(fields: [zoneId], references: [id], onDelete: SetNull)\n    territory          Territory?           @relation(fields: [territoryId], references: [id], onDelete: SetNull)\n    beat               Beat?                @relation(fields: [beatId], references: [id], onDelete: SetNull)');

// 4. Inject new hierarchical models
const hierarchicalModels = `
model Region {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  createdAt DateTime @default(now())

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  zones     Zone[]
  customers Customer[]

  @@index([tenantId])
  @@map("regions")
}

model Zone {
  id        String   @id @default(uuid())
  tenantId  String
  regionId  String
  name      String
  createdAt DateTime @default(now())

  tenant      Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  region      Region     @relation(fields: [regionId], references: [id], onDelete: Cascade)
  territories Territory[]
  customers   Customer[]

  @@index([tenantId])
  @@index([regionId])
  @@map("zones")
}

model Territory {
  id        String   @id @default(uuid())
  tenantId  String
  zoneId    String
  name      String
  createdAt DateTime @default(now())

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  zone      Zone       @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  beats     Beat[]
  customers Customer[]

  @@index([tenantId])
  @@index([zoneId])
  @@map("territories")
}

model Beat {
  id          String   @id @default(uuid())
  tenantId    String
  territoryId String
  name        String
  createdAt   DateTime @default(now())

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  territory Territory  @relation(fields: [territoryId], references: [id], onDelete: Cascade)
  customers Customer[]

  @@index([tenantId])
  @@index([territoryId])
  @@map("beats")
}
`;

c = c.replace(/\/\/ 5\. CUSTOMERS & KHATA \(CREDIT LEDGER\)/, `${hierarchicalModels}\n// 5. CUSTOMERS & KHATA (CREDIT LEDGER)`);

// 5. Inject Tenant arrays
c = c.replace(/customers             Customer\[\]\n/, 'customers             Customer[]\n    regions               Region[]\n    zones                 Zone[]\n    territories           Territory[]\n    beats                 Beat[]\n');

fs.writeFileSync(p, c, 'utf8');
console.log('Hierarchy models successfully injected');
