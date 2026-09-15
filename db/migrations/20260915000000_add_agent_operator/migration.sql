-- Additive: Agent operator binding — AIAgent gains an optional operatorUserId linking
-- to an agent-role User who operates it. Enables data scoping for `agent` role actors.

ALTER TABLE "AIAgent" ADD COLUMN "operatorUserId" TEXT;

CREATE INDEX "AIAgent_operatorUserId_idx" ON "AIAgent"("operatorUserId");

ALTER TABLE "AIAgent" ADD CONSTRAINT "AIAgent_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;