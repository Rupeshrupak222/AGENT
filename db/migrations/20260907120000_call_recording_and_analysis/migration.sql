-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('pending', 'available', 'uploading', 'uploaded', 'failed', 'deleted');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "CallRecording" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerRecordingId" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'cloudflare_r2',
    "objectKey" TEXT,
    "storageUrl" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "duration" INTEGER,
    "size" INTEGER,
    "status" "RecordingStatus" NOT NULL DEFAULT 'pending',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallAnalysis" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadScore" INTEGER,
    "intent" TEXT,
    "sentiment" TEXT,
    "summary" TEXT,
    "qualification" JSONB,
    "outcome" TEXT,
    "nextAction" TEXT,
    "appointmentDetected" BOOLEAN NOT NULL DEFAULT false,
    "appointmentDetails" JSONB,
    "model" TEXT,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "processingStatus" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallRecording_tenantId_providerRecordingId_key" ON "CallRecording"("tenantId", "providerRecordingId");

-- CreateIndex
CREATE INDEX "CallRecording_callId_idx" ON "CallRecording"("callId");

-- CreateIndex
CREATE INDEX "CallRecording_tenantId_idx" ON "CallRecording"("tenantId");

-- CreateIndex
CREATE INDEX "CallRecording_status_idx" ON "CallRecording"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CallAnalysis_callId_key" ON "CallAnalysis"("callId");

-- CreateIndex
CREATE INDEX "CallAnalysis_tenantId_idx" ON "CallAnalysis"("tenantId");

-- CreateIndex
CREATE INDEX "CallAnalysis_processingStatus_idx" ON "CallAnalysis"("processingStatus");

-- AddForeignKey
ALTER TABLE "CallRecording" ADD CONSTRAINT "CallRecording_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecording" ADD CONSTRAINT "CallRecording_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallAnalysis" ADD CONSTRAINT "CallAnalysis_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallAnalysis" ADD CONSTRAINT "CallAnalysis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
