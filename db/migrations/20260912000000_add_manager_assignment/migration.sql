-- Additive: Manager data scoping — AIAgent gains an optional managerId linking
-- an agent to the manager who supervises it. Managers see only their agents'
-- calls, leads, campaigns, and analytics. Does not alter or drop existing data.

-- AlterTable
ALTER TABLE "AIAgent" ADD COLUMN "managerId" TEXT;

-- CreateIndex
CREATE INDEX "AIAgent_managerId_idx" ON "AIAgent"("managerId");

-- AddForeignKey
ALTER TABLE "AIAgent" ADD CONSTRAINT "AIAgent_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;