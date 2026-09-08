-- Day 16: CRM Automation Engine + Meta WhatsApp Cloud API + Resend Email

-- AlterEnum
ALTER TYPE "AutomationStatus" ADD VALUE IF NOT EXISTS 'read';
ALTER TYPE "AutomationStatus" ADD VALUE IF NOT EXISTS 'skipped';

-- AlterEnum
ALTER TYPE "AutomationTrigger" ADD VALUE IF NOT EXISTS 'call_analysis_completed';
ALTER TYPE "AutomationTrigger" ADD VALUE IF NOT EXISTS 'lead_disqualified';
ALTER TYPE "AutomationTrigger" ADD VALUE IF NOT EXISTS 'appointment_detected';
ALTER TYPE "AutomationTrigger" ADD VALUE IF NOT EXISTS 'campaign_lead_completed';

-- AlterEnum
ALTER TYPE "AutomationAction" ADD VALUE IF NOT EXISTS 'send_whatsapp';
ALTER TYPE "AutomationAction" ADD VALUE IF NOT EXISTS 'send_email';

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'resend';

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "conditions" JSONB DEFAULT '[]';
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "actions" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "AutomationLog" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;
ALTER TABLE "AutomationLog" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
