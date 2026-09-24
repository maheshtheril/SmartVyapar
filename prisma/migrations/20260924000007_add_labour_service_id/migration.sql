-- AlterTable
ALTER TABLE "job_card_items" ADD COLUMN "labourServiceId" TEXT;

-- AddForeignKey
ALTER TABLE "job_card_items" ADD CONSTRAINT "job_card_items_labourServiceId_fkey" FOREIGN KEY ("labourServiceId") REFERENCES "LabourService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
