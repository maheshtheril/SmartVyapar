-- AlterTable
ALTER TABLE "stock_logs" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stock_logs_idempotencyKey_key" ON "stock_logs"("idempotencyKey");
