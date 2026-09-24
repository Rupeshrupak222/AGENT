-- Consolidate roles to super_admin / company_admin / manager.
--
-- Done as a type swap (RENAME + CREATE + ALTER ... USING) instead of
-- ALTER TYPE ... DROP VALUE because the swap is transaction-safe and works
-- on proxies/older Postgres where DROP VALUE cannot run inside a transaction.

-- 1. Drop the legacy column default before the enum swap (it references 'agent').
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- 2. Swap the enum type; map any stranded legacy rows (agent/viewer) to manager.
ALTER TYPE "Role" RENAME TO "Role_legacy";
CREATE TYPE "Role" AS ENUM ('super_admin', 'company_admin', 'manager');
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE
      WHEN "role"::text IN ('agent', 'viewer') THEN 'manager'::"Role"
      ELSE "role"::text::"Role"
    END
  );
DROP TYPE "Role_legacy";

-- 3. Re-establish a sensible default: every user is now manager or above.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'manager';