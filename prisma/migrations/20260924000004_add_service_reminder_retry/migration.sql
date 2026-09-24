-- AlterTable
ALTER TABLE "ServiceReminder" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3);
