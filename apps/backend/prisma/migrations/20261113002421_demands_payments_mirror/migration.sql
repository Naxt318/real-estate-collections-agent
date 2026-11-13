-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('RAISED', 'PARTIALLY_PAID', 'PAID', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('BUYER', 'BANK', 'OTHER');

-- CreateTable
CREATE TABLE "demands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_payload" JSONB,
    "booking_id" UUID NOT NULL,
    "stage_name" TEXT NOT NULL,
    "stage_sequence" INTEGER NOT NULL,
    "demand_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "amount_due" DECIMAL(14,2) NOT NULL,
    "expected_bank_amount" DECIMAL(14,2),
    "crm_outstanding" DECIMAL(14,2),
    "status" "DemandStatus" NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_payload" JSONB,
    "booking_id" UUID NOT NULL,
    "demand_id" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "paid_at" TIMESTAMPTZ(3) NOT NULL,
    "payer_type" "PayerType" NOT NULL,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demands_tenant_id_booking_id_idx" ON "demands"("tenant_id", "booking_id");

-- CreateIndex
CREATE INDEX "demands_tenant_id_status_due_date_idx" ON "demands"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "demands_tenant_id_source_external_id_key" ON "demands"("tenant_id", "source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "demands_tenant_id_id_key" ON "demands"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_demand_id_idx" ON "payments"("tenant_id", "demand_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_booking_id_idx" ON "payments"("tenant_id", "booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_tenant_id_source_external_id_key" ON "payments"("tenant_id", "source", "external_id");

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_tenant_id_booking_id_fkey" FOREIGN KEY ("tenant_id", "booking_id") REFERENCES "bookings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_booking_id_fkey" FOREIGN KEY ("tenant_id", "booking_id") REFERENCES "bookings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_demand_id_fkey" FOREIGN KEY ("tenant_id", "demand_id") REFERENCES "demands"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data-integrity CHECKs.

ALTER TABLE "demands" ADD CONSTRAINT demands_amount_due_non_negative
  CHECK (amount_due >= 0);
ALTER TABLE "demands" ADD CONSTRAINT demands_bank_share_within_due
  CHECK (expected_bank_amount IS NULL OR (expected_bank_amount >= 0 AND expected_bank_amount <= amount_due));
ALTER TABLE "payments" ADD CONSTRAINT payments_amount_positive
  CHECK (amount > 0);

-- Tenant isolation, same predicate as the enable_rls migration.

ALTER TABLE "demands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demands" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "demands"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payments"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
