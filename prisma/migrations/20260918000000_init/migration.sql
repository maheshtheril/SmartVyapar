-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CREDIT');

-- CreateEnum
CREATE TYPE "StockLogType" AS ENUM ('INITIAL', 'PURCHASE_IN', 'SALE_OUT', 'RETURN_IN', 'MANUAL_ADJUSTMENT', 'CONSUMPTION_OUT');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RETAIL_ITEM', 'RAW_MATERIAL', 'FINISHED_GOOD');

-- CreateEnum
CREATE TYPE "AccountClassification" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('VACANT', 'OCCUPIED', 'BILLED');

-- CreateEnum
CREATE TYPE "KotStatus" AS ENUM ('PREPARING', 'SERVED', 'SETTLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "legalName" TEXT,
    "gstin" TEXT,
    "stateCode" TEXT NOT NULL DEFAULT '32',
    "stateName" TEXT DEFAULT 'Kerala',
    "upiId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "isComposition" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "logoUrl" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "hsnCode" TEXT NOT NULL DEFAULT '9983',
    "category" TEXT,
    "productType" "ProductType" NOT NULL DEFAULT 'RETAIL_ITEM',
    "baseUnit" TEXT NOT NULL DEFAULT 'PCS',
    "hasAltUnit" BOOLEAN NOT NULL DEFAULT false,
    "altUnit" TEXT,
    "conversionFactor" DECIMAL(10,3) DEFAULT 1.0,
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "purchasePricePerAlt" DECIMAL(10,2),
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "sellingPricePerAlt" DECIMAL(10,2),
    "mrp" DECIMAL(10,2),
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0.0,
    "minStockAlert" DECIMAL(10,3) NOT NULL DEFAULT 5.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hasBatchTracking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuProductId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityRequired" DECIMAL(12,3) NOT NULL,
    "wastePercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "changeQty" DECIMAL(12,3) NOT NULL,
    "type" "StockLogType" NOT NULL,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "gstin" TEXT,
    "stateCode" TEXT,
    "address" TEXT,
    "outstandingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerGstin" TEXT,
    "customerStateCode" TEXT NOT NULL,
    "isInterState" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "cgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "sgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "igstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "totalTax" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "dueAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'UPI',
    "upiUri" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "unitSold" TEXT NOT NULL DEFAULT 'PCS',
    "quantity" DECIMAL(12,3) NOT NULL,
    "conversionFactor" DECIMAL(10,3) NOT NULL DEFAULT 1.0,
    "baseQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0.0,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "cgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "sgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "igstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "batchId" TEXT,
    "batchNumber" TEXT,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_bills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierName" TEXT NOT NULL,
    "supplierGstin" TEXT,
    "totalTaxable" DECIMAL(10,2) NOT NULL,
    "cgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "sgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "igstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "scannedFileUrl" TEXT,
    "aiConfidenceScore" DECIMAL(4,2),
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_bill_items" (
    "id" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "hsnCode" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "quantity" DECIMAL(12,3) NOT NULL,
    "packageSize" DECIMAL(10,3) NOT NULL DEFAULT 1.0,
    "baseQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0.0,
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "baseCostPrice" DECIMAL(10,2),
    "mrp" DECIMAL(10,2),
    "gstRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "purchase_bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" "AccountClassification" NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "costPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "mrp" DECIMAL(10,2) NOT NULL,
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'Main Hall',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "TableStatus" NOT NULL DEFAULT 'VACANT',
    "activeKotId" TEXT,
    "currentTotal" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "occupiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_order_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "kotNumber" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 2,
    "waiterName" TEXT,
    "status" "KotStatus" NOT NULL DEFAULT 'PREPARING',
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_order_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kot_items" (
    "id" TEXT NOT NULL,
    "kotId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "isServed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'INV',
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_barcode_idx" ON "products"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "recipe_items_tenantId_menuProductId_idx" ON "recipe_items"("tenantId", "menuProductId");

-- CreateIndex
CREATE INDEX "recipe_items_tenantId_ingredientId_idx" ON "recipe_items"("tenantId", "ingredientId");

-- CreateIndex
CREATE INDEX "stock_logs_tenantId_productId_idx" ON "stock_logs"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "customers_tenantId_phone_idx" ON "customers"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "invoices_tenantId_invoiceDate_idx" ON "invoices"("tenantId", "invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_tenantId_paymentStatus_idx" ON "invoices"("tenantId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenantId_invoiceNumber_key" ON "invoices"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "purchase_bills_tenantId_idx" ON "purchase_bills"("tenantId");

-- CreateIndex
CREATE INDEX "accounts_tenantId_classification_idx" ON "accounts"("tenantId", "classification");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenantId_code_key" ON "accounts"("tenantId", "code");

-- CreateIndex
CREATE INDEX "batches_tenantId_productId_idx" ON "batches"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "batches_tenantId_expiryDate_idx" ON "batches"("tenantId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "batches_tenantId_productId_batchNumber_key" ON "batches"("tenantId", "productId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_tenantId_name_key" ON "restaurant_tables"("tenantId", "name");

-- CreateIndex
CREATE INDEX "kitchen_order_tickets_tenantId_tableId_idx" ON "kitchen_order_tickets"("tenantId", "tableId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_sequences_tenantId_financialYear_prefix_key" ON "invoice_sequences"("tenantId", "financialYear", "prefix");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_menuProductId_fkey" FOREIGN KEY ("menuProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill_items" ADD CONSTRAINT "purchase_bill_items_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "purchase_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill_items" ADD CONSTRAINT "purchase_bill_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_order_tickets" ADD CONSTRAINT "kitchen_order_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_order_tickets" ADD CONSTRAINT "kitchen_order_tickets_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_kotId_fkey" FOREIGN KEY ("kotId") REFERENCES "kitchen_order_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

