-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COLLECTIONS_LEAD', 'AGENT');

-- AlterTable
-- Prisma stored the old timestamp columns as UTC; USING ... AT TIME ZONE 'UTC' keeps existing
-- values correct instead of reinterpreting them in the session time zone.
ALTER TABLE "tenants"
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'AGENT',
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
