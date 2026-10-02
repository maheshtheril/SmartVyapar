const fs = require('fs');
const path = 'prisma/schema.prisma';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  'model Tenant {\n  id                 String',
  'model Tenant {\n  priceLists         PriceList[]\n  id                 String'
);

c = c.replace(
  'model Customer {\n  id                 String   @id @default(uuid())',
  'model Customer {\n  id                 String   @id @default(uuid())\n  priceListId        String?'
);

c = c.replace(
  '  tenant              Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)\n  account             Account?             @relation(fields: [accountId], references: [id])',
  '  tenant              Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)\n  priceList           PriceList?           @relation(fields: [priceListId], references: [id], onDelete: SetNull)\n  account             Account?             @relation(fields: [accountId], references: [id])'
);

c += `
// ----------------------------------------------------
// 10. DYNAMIC PRICE LISTS (ZOHO-STYLE MULTI-TIER PRICING)
// ----------------------------------------------------

model PriceList {
  id          String   @id @default(uuid())
  tenantId    String
  name        String   // e.g. "Wholesale Tier 1", "VIP Customers"
  description String?
  
  // Global Rule settings
  type        String   @default("PERCENTAGE_DISCOUNT") // PERCENTAGE_DISCOUNT, MARKUP_ON_COST
  value       Decimal  @default(0.0) @db.Decimal(10, 2) // e.g. 15.0 for 15% discount
  
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customers   Customer[]
  items       PriceListItem[]

  @@index([tenantId])
}

model PriceListItem {
  id          String   @id @default(uuid())
  priceListId String
  productId   String
  
  // Item-level override
  type        String   @default("FIXED_PRICE") // FIXED_PRICE, PERCENTAGE_DISCOUNT
  value       Decimal  @db.Decimal(10, 2) // e.g. 500 for Rs.500 fixed price
  
  priceList   PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@unique([priceListId, productId])
}
`;

fs.writeFileSync(path, c);
console.log("Safely updated schema");
