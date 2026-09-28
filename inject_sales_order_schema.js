const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

const salesOrderSchema = `
// 12. SALES ORDERS (FIELD BOOKING)
// ----------------------------------------------------
model SalesOrder {
  id                   String   @id @default(uuid())
  tenantId             String
  orderNumber          String
  customerId           String
  date                 DateTime @default(now())
  expectedDeliveryDate DateTime?
  status               String   @default("PENDING") // PENDING, CONFIRMED, FULFILLED, CANCELLED
  totalAmount          Decimal  @default(0.0) @db.Decimal(12, 2)
  notes                String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant     Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer   Customer             @relation(fields: [customerId], references: [id], onDelete: Restrict)
  lineItems  SalesOrderLineItem[]

  @@unique([tenantId, orderNumber])
  @@index([tenantId])
  @@index([customerId])
  @@map("sales_orders")
}

model SalesOrderLineItem {
  id           String   @id @default(uuid())
  salesOrderId String
  productId    String
  quantity     Int
  unitPrice    Decimal  @default(0.0) @db.Decimal(10, 2)
  totalPrice   Decimal  @default(0.0) @db.Decimal(12, 2)

  salesOrder SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Cascade)
  product    Product    @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([salesOrderId])
  @@index([productId])
  @@map("sales_order_line_items")
}
`;

// Insert the schema before the end of the file or after Invoices
c = c + '\n' + salesOrderSchema;

// Update Customer model to include SalesOrder relation
c = c.replace(/invoices            Invoice\[\]/, `invoices            Invoice[]\n    salesOrders         SalesOrder[]`);

// Update Product model to include SalesOrderLineItem relation
c = c.replace(/invoiceItems InvoiceLineItem\[\]/, `invoiceItems InvoiceLineItem[]\n    salesOrderItems SalesOrderLineItem[]`);

// Update Tenant model to include SalesOrder relation
c = c.replace(/invoices           Invoice\[\]/, `invoices           Invoice[]\n    salesOrders        SalesOrder[]`);

fs.writeFileSync(p, c, 'utf8');
console.log('Injected SalesOrder and SalesOrderLineItem into schema');
