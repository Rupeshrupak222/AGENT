-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'companies',
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "format" TEXT NOT NULL DEFAULT 'csv',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);
