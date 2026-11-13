-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "secret_ref" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "last_success_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "counts" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_policies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "max_promise_deferral_days" INTEGER NOT NULL DEFAULT 15,
    "calling_window_start" TIME(0) NOT NULL DEFAULT '10:00',
    "calling_window_end" TIME(0) NOT NULL DEFAULT '19:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "max_call_attempts_per_case" INTEGER NOT NULL DEFAULT 6,
    "contact_risk_skip_threshold" INTEGER NOT NULL DEFAULT 70,
    "default_late_interest_rate_pa" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "collection_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadence_steps" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "day_offset" INTEGER NOT NULL,
    "repeat_every_days" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cadence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_talking_points" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "requires_home_loan" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "approved_talking_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_tenant_id_source_key" ON "integration_connections"("tenant_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_tenant_id_id_key" ON "integration_connections"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "sync_runs_tenant_id_connection_id_started_at_idx" ON "sync_runs"("tenant_id", "connection_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "collection_policies_tenant_id_key" ON "collection_policies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cadence_steps_tenant_id_day_offset_key" ON "cadence_steps"("tenant_id", "day_offset");

-- CreateIndex
CREATE UNIQUE INDEX "approved_talking_points_tenant_id_key_key" ON "approved_talking_points"("tenant_id", "key");

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_tenant_id_connection_id_fkey" FOREIGN KEY ("tenant_id", "connection_id") REFERENCES "integration_connections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_policies" ADD CONSTRAINT "collection_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_talking_points" ADD CONSTRAINT "approved_talking_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data-integrity CHECKs.

ALTER TABLE "collection_policies" ADD CONSTRAINT collection_policies_risk_threshold_range
  CHECK (contact_risk_skip_threshold BETWEEN 0 AND 100);
ALTER TABLE "collection_policies" ADD CONSTRAINT collection_policies_deferral_non_negative
  CHECK (max_promise_deferral_days >= 0);
ALTER TABLE "collection_policies" ADD CONSTRAINT collection_policies_attempts_positive
  CHECK (max_call_attempts_per_case >= 1);
ALTER TABLE "collection_policies" ADD CONSTRAINT collection_policies_window_ordered
  CHECK (calling_window_start < calling_window_end);
ALTER TABLE "cadence_steps" ADD CONSTRAINT cadence_steps_repeat_positive
  CHECK (repeat_every_days IS NULL OR repeat_every_days >= 1);

-- Tenant isolation, same predicate as the enable_rls migration.

ALTER TABLE "integration_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_connections" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "integration_connections"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "sync_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sync_runs"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "collection_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_policies" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "collection_policies"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cadence_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cadence_steps" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cadence_steps"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "approved_talking_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approved_talking_points" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "approved_talking_points"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
