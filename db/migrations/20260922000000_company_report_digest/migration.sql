-- AlterTable
ALTER TABLE "ScheduledReport" ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
ADD COLUMN IF NOT EXISTS "companyName" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledReport_tenantId_idx" ON "ScheduledReport"("tenantId");