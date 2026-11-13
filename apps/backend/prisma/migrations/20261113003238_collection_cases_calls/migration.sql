-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CALL_SCHEDULED', 'PROMISED', 'AWAITING_APPROVAL', 'NUDGED', 'PAID', 'ESCALATED', 'CLOSED_UNRESOLVED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('PROMISED', 'PAYMENT_LINK_REQUESTED', 'CLAIMS_ALREADY_PAID', 'CALLBACK_REQUESTED', 'DISPUTE', 'HARDSHIP', 'WRONG_NUMBER', 'NO_ANSWER', 'BUSY', 'DECLINED_TO_DISCUSS', 'OPTED_OUT', 'ABUSIVE');

-- CreateEnum
CREATE TYPE "HandledBy" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "ScheduledCallStatus" AS ENUM ('PENDING', 'DISPATCHED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Hostility" AS ENUM ('NONE', 'MILD', 'HIGH', 'ABUSIVE');

-- CreateTable
CREATE TABLE "collection_cases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "handled_by" "HandledBy" NOT NULL DEFAULT 'AI',
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "next_action_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "collection_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_demands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "demand_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "case_demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_calls" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
    "status" "ScheduledCallStatus" NOT NULL DEFAULT 'PENDING',
    "skip_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "scheduled_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_attempts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scheduled_call_id" UUID,
    "case_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "provider_call_id" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "duration_sec" INTEGER,
    "connected" BOOLEAN NOT NULL,
    "outcome" "CallOutcome",
    "hostility" "Hostility" NOT NULL DEFAULT 'NONE',
    "summary" TEXT,
    "transcript_uri" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "call_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_status_idx" ON "collection_cases"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "collection_cases_tenant_id_id_key" ON "collection_cases"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "case_demands_tenant_id_demand_id_idx" ON "case_demands"("tenant_id", "demand_id");

-- CreateIndex
CREATE INDEX "scheduled_calls_tenant_id_status_scheduled_for_idx" ON "scheduled_calls"("tenant_id", "status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_calls_tenant_id_id_key" ON "scheduled_calls"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "call_attempts_tenant_id_id_key" ON "call_attempts"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_demands" ADD CONSTRAINT "case_demands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_demands" ADD CONSTRAINT "case_demands_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "collection_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_demands" ADD CONSTRAINT "case_demands_tenant_id_demand_id_fkey" FOREIGN KEY ("tenant_id", "demand_id") REFERENCES "demands"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "collection_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_tenant_id_scheduled_call_id_fkey" FOREIGN KEY ("tenant_id", "scheduled_call_id") REFERENCES "scheduled_calls"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "collection_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes: Prisma cannot express them, so they live here. The drift check stays
-- clean because Prisma does not introspect index predicates.

-- One open case per person: all of a buyer's due demands share one combined case.
CREATE UNIQUE INDEX collection_cases_one_open_per_person
  ON "collection_cases" ("tenant_id", "person_id") WHERE "closed_at" IS NULL;

-- A demand is active in at most one case.
-- Application logic (a later plan): closing a case must also set removed_at on its case_demands,
-- otherwise the closed case keeps blocking its demands from joining a new case.
CREATE UNIQUE INDEX case_demands_one_active_case
  ON "case_demands" ("tenant_id", "demand_id") WHERE "removed_at" IS NULL;

-- Tenant isolation, same predicate as the enable_rls migration.

ALTER TABLE "collection_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_cases" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "collection_cases"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "case_demands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "case_demands" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "case_demands"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "scheduled_calls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_calls" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "scheduled_calls"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "call_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call_attempts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "call_attempts"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
