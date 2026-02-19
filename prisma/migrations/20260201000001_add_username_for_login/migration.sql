-- AlterTable: add username (nullable) and make email nullable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Drop old unique, add new unique
DROP INDEX IF EXISTS "User_tenantId_email_key";
CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

-- Backfill username for existing users (demo users get admin/operador, rest get part before @)
UPDATE "User" SET "username" = CASE
  WHEN "email" = 'admin@demo.com' THEN 'admin'
  WHEN "email" = 'operador@demo.com' THEN 'operador'
  ELSE split_part("email", '@', 1)
END
WHERE "username" IS NULL;
