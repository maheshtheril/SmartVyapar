-- AlterTable
ALTER TABLE "job_cards" ADD COLUMN "inspectionDetails" JSONB,
ADD COLUMN "deliveryDetails" JSONB;

-- AlterTable
ALTER TABLE "job_card_items" ADD COLUMN "isConsumed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ServiceReminder" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReminder_idempotencyKey_key" ON "ServiceReminder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "products_tenantId_sku_idx" ON "products"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "products_tenantId_partNumber_idx" ON "products"("tenantId", "partNumber");

-- CreateIndex
CREATE INDEX "products_tenantId_oemNumber_idx" ON "products"("tenantId", "oemNumber");

-- CreateIndex
CREATE INDEX "products_tenantId_name_idx" ON "products"("tenantId", "name");
