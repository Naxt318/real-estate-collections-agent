/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PromiseStatus" AS ENUM ('PENDING_APPROVAL', 'PENDING', 'KEPT', 'PARTIALLY_KEPT', 'BROKEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SCHEDULED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "EscalationReason" AS ENUM ('ABUSE', 'DISPUTE', 'HARDSHIP', 'HIGH_CONTACT_RISK', 'PROMISE_BEYOND_LIMIT', 'MAX_ATTEMPTS_REACHED', 'BUYER_REQUEST');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "payment_promises" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "call_attempt_id" UUID NOT NULL,
    "proposed_date" DATE,
    "agreed_date" DATE NOT NULL,
    "agreed_amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PromiseStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_promises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "promise_id" UUID,
    "channel" "CommunicationChannel" NOT NULL,
    "payment_link_url" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "send_at" TIMESTAMPTZ(3) NOT NULL,
    "sent_at" TIMESTAMPTZ(3),
    "status" "MessageStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "call_attempt_id" UUID,
    "reason" "EscalationReason" NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_user_id" UUID,
    "resolution_note" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_promises_tenant_id_status_agreed_date_idx" ON "payment_promises"("tenant_id", "status", "agreed_date");

-- CreateIndex
CREATE UNIQUE INDEX "payment_promises_tenant_id_id_key" ON "payment_promises"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "outbound_messages_tenant_id_case_id_idx" ON "outbound_messages"("tenant_id", "case_id");

-- CreateIndex
CREATE INDEX "escalations_tenant_id_status_created_at_idx" ON "escalations"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_id_key" ON "users"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "collection_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_tenant_id_call_attempt_id_fkey" FOREIGN KEY ("tenant_id", "call_attempt_id") REFERENCES "call_attempts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "collection_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_tenant_id_promise_id_fkey" FOREIGN KEY ("tenant_id", "promise_id") REFERENCES "payment_promises"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "collection_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "persons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_tenant_id_call_attempt_id_fkey" FOREIGN KEY ("tenant_id", "call_attempt_id") REFERENCES "call_attempts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_tenant_id_assigned_to_user_id_fkey" FOREIGN KEY ("tenant_id", "assigned_to_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Value rules Prisma cannot express.
ALTER TABLE "payment_promises" ADD CONSTRAINT payment_promises_agreed_amount_positive
  CHECK ("agreed_amount" > 0);
-- A negotiation never ends later than the buyer's first ask.
ALTER TABLE "payment_promises" ADD CONSTRAINT payment_promises_agreed_not_before_proposed
  CHECK ("proposed_date" IS NULL OR "agreed_date" >= "proposed_date");
ALTER TABLE "outbound_messages" ADD CONSTRAINT outbound_messages_amount_positive
  CHECK ("amount" > 0);

-- Tenant isolation, same predicate as the enable_rls migration.

ALTER TABLE "payment_promises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_promises" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payment_promises"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "outbound_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbound_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "outbound_messages"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "escalations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "escalations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "escalations"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
