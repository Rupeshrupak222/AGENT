-- ============================================================
-- Day 17 — Appointment & Scheduling (calendar provider layer)
-- Forward-only migration, additive only. Never edit old migrations.
-- ============================================================

-- 1. Extend AppointmentStatus (additive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'AppointmentStatus'::regtype) THEN
    ALTER TYPE "AppointmentStatus" ADD VALUE 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rescheduled' AND enumtypid = 'AppointmentStatus'::regtype) THEN
    ALTER TYPE "AppointmentStatus" ADD VALUE 'rescheduled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'failed' AND enumtypid = 'AppointmentStatus'::regtype) THEN
    ALTER TYPE "AppointmentStatus" ADD VALUE 'failed';
  END IF;
END $$;

-- 2. Extend AutomationTrigger (additive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_booked' AND enumtypid = 'AutomationTrigger'::regtype) THEN
    ALTER TYPE "AutomationTrigger" ADD VALUE 'appointment_booked';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_confirmed' AND enumtypid = 'AutomationTrigger'::regtype) THEN
    ALTER TYPE "AutomationTrigger" ADD VALUE 'appointment_confirmed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_rescheduled' AND enumtypid = 'AutomationTrigger'::regtype) THEN
    ALTER TYPE "AutomationTrigger" ADD VALUE 'appointment_rescheduled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_cancelled' AND enumtypid = 'AutomationTrigger'::regtype) THEN
    ALTER TYPE "AutomationTrigger" ADD VALUE 'appointment_cancelled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_completed' AND enumtypid = 'AutomationTrigger'::regtype) THEN
    ALTER TYPE "AutomationTrigger" ADD VALUE 'appointment_completed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_no_show' AND enumtypid = 'AutomationTrigger'::regtype) THEN
    ALTER TYPE "AutomationTrigger" ADD VALUE 'appointment_no_show';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_reminder' AND enumtypid = 'AutomationTrigger'::regtype) THEN
    ALTER TYPE "AutomationTrigger" ADD VALUE 'appointment_reminder';
  END IF;
END $$;

-- 3. Extend IntegrationProvider (additive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'calcom' AND enumtypid = 'IntegrationProvider'::regtype) THEN
    ALTER TYPE "IntegrationProvider" ADD VALUE 'calcom';
  END IF;
END $$;

-- 4. Add Day 17 column set to "Appointment" (additive, all nullable/defaulted)
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "calendarProvider" TEXT NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS "providerAppointmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerBookingUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "attendeeEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "attendeePhone" TEXT,
  ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "callId" TEXT,
  ADD COLUMN IF NOT EXISTS "campaignId" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmationSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminder24hSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminder1hSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rescheduleReason" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByEmail" TEXT;

-- 5. Backfill startAt/endAt for legacy rows so reminders can run
UPDATE "Appointment"
SET "startAt" = "date",
    "endAt" = "date" + ("duration" * interval '1 minute')
WHERE "startAt" IS NULL;

-- 6. Indexes for scheduling queries + idempotency key uniqueness
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_status_idx" ON "Appointment" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_startAt_idx" ON "Appointment" ("tenantId", "startAt");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_providerAppointmentId_idx" ON "Appointment" ("tenantId", "providerAppointmentId");
CREATE INDEX IF NOT EXISTS "Appointment_leadId_idx" ON "Appointment" ("leadId");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_tenantId_idempotencyKey_key" ON "Appointment" ("tenantId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;