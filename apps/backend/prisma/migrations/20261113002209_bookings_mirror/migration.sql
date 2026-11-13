-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('CONSTRUCTION_LINKED', 'TIME_LINKED', 'DOWN_PAYMENT', 'SUBVENTION', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'POSSESSION_HANDED_OVER');

-- CreateEnum
CREATE TYPE "ApplicantRole" AS ENUM ('PRIMARY', 'CO_APPLICANT');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_payload" JSONB,
    "full_name" TEXT NOT NULL,
    "primary_phone" TEXT NOT NULL,
    "alt_phone" TEXT,
    "email" TEXT,
    "preferred_language" TEXT,
    "do_not_call" BOOLEAN NOT NULL DEFAULT false,
    "opted_out_at" TIMESTAMPTZ(3),
    "preferred_channel" "CommunicationChannel",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" "CrmSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_payload" JSONB,
    "unit_id" UUID NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "booking_date" DATE NOT NULL,
    "agreement_date" DATE,
    "agreement_value" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "has_home_loan" BOOLEAN NOT NULL DEFAULT false,
    "lender_name" TEXT,
    "late_payment_interest_rate_pa" DECIMAL(5,2),
    "primary_contact_person_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_applicants" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" "ApplicantRole" NOT NULL,
    "call_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "booking_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_tenant_id_source_external_id_key" ON "persons"("tenant_id", "source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "persons_tenant_id_id_key" ON "persons"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_unit_id_idx" ON "bookings"("tenant_id", "unit_id");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_primary_contact_person_id_idx" ON "bookings"("tenant_id", "primary_contact_person_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tenant_id_source_external_id_key" ON "bookings"("tenant_id", "source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tenant_id_id_key" ON "bookings"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "booking_applicants_tenant_id_person_id_idx" ON "booking_applicants"("tenant_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_applicants_booking_id_person_id_key" ON "booking_applicants"("booking_id", "person_id");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_unit_id_fkey" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_primary_contact_person_id_fkey" FOREIGN KEY ("tenant_id", "primary_contact_person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_applicants" ADD CONSTRAINT "booking_applicants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_applicants" ADD CONSTRAINT "booking_applicants_tenant_id_booking_id_fkey" FOREIGN KEY ("tenant_id", "booking_id") REFERENCES "bookings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_applicants" ADD CONSTRAINT "booking_applicants_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data-integrity CHECKs.

ALTER TABLE "persons" ADD CONSTRAINT persons_primary_phone_e164
  CHECK (primary_phone ~ '^\+[1-9][0-9]{6,14}$');
ALTER TABLE "persons" ADD CONSTRAINT persons_alt_phone_e164
  CHECK (alt_phone IS NULL OR alt_phone ~ '^\+[1-9][0-9]{6,14}$');
ALTER TABLE "booking_applicants" ADD CONSTRAINT booking_applicants_call_order_positive
  CHECK (call_order >= 1);
ALTER TABLE "bookings" ADD CONSTRAINT bookings_amounts_non_negative
  CHECK (agreement_value >= 0);

-- Tenant isolation, same predicate as the enable_rls migration.

ALTER TABLE "persons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "persons" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "persons"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bookings"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "booking_applicants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_applicants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "booking_applicants"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
