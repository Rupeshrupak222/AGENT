-- Add the missing providerCallId index declared in schema.prisma
-- (Call @@index([providerCallId])). Non-destructive; index only, no data change.
CREATE INDEX IF NOT EXISTS "Call_providerCallId_idx" ON "Call"("providerCallId");