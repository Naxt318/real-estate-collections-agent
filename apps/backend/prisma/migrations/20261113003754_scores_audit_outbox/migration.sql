-- CreateEnum
CREATE TYPE "ScoreKind" AS ENUM ('CONTACT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "RiskBand" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'INSUFFICIENT_HISTORY');

-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('RULE', 'AI', 'HUMAN');

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "kind" "ScoreKind" NOT NULL,
    "value" INTEGER NOT NULL,
    "band" "RiskBand" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "kind" "ScoreKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "value_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "source" "ScoreSource" NOT NULL,
    "actor_user_id" UUID,
    "call_attempt_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "risk_scores_tenant_id_person_id_kind_key" ON "risk_scores"("tenant_id", "person_id", "kind");

-- CreateIndex
CREATE INDEX "score_events_tenant_id_person_id_created_at_idx" ON "score_events"("tenant_id", "person_id", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_tenant_id_processed_at_idx" ON "outbox_events"("tenant_id", "processed_at");

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_tenant_id_actor_user_id_fkey" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_tenant_id_call_attempt_id_fkey" FOREIGN KEY ("tenant_id", "call_attempt_id") REFERENCES "call_attempts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_actor_user_id_fkey" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Value rules Prisma cannot express.
ALTER TABLE "risk_scores" ADD CONSTRAINT risk_scores_value_range
  CHECK ("value" BETWEEN 0 AND 100);
ALTER TABLE "score_events" ADD CONSTRAINT score_events_value_after_range
  CHECK ("value_after" BETWEEN 0 AND 100);

-- Score history and the audit log are append-only for the app role.
-- outbox_events stays updatable so the app can mark rows processed.
REVOKE UPDATE, DELETE ON "score_events", "audit_logs" FROM app_user;

-- Tenant isolation, same predicate as the enable_rls migration.

ALTER TABLE "risk_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_scores" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "risk_scores"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "score_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "score_events"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_logs"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "outbox_events"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
