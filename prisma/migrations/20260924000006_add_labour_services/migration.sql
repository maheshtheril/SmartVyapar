-- CreateTable
CREATE TABLE "LabourService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sacCode" TEXT NOT NULL DEFAULT '998714',
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "hourlyRate" DECIMAL(10,2),
    "fixedRate" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabourService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabourService_tenantId_name_key" ON "LabourService"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "LabourService" ADD CONSTRAINT "LabourService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
