-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_actor_user_id_idx" ON "audit_logs"("tenant_id", "actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "call_attempts_tenant_id_scheduled_call_id_idx" ON "call_attempts"("tenant_id", "scheduled_call_id");

-- CreateIndex
CREATE INDEX "call_attempts_tenant_id_case_id_idx" ON "call_attempts"("tenant_id", "case_id");

-- CreateIndex
CREATE INDEX "call_attempts_tenant_id_person_id_idx" ON "call_attempts"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "case_demands_tenant_id_case_id_idx" ON "case_demands"("tenant_id", "case_id");

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_person_id_idx" ON "collection_cases"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "escalations_tenant_id_case_id_idx" ON "escalations"("tenant_id", "case_id");

-- CreateIndex
CREATE INDEX "escalations_tenant_id_person_id_idx" ON "escalations"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "escalations_tenant_id_call_attempt_id_idx" ON "escalations"("tenant_id", "call_attempt_id");

-- CreateIndex
CREATE INDEX "escalations_tenant_id_assigned_to_user_id_idx" ON "escalations"("tenant_id", "assigned_to_user_id");

-- CreateIndex
CREATE INDEX "outbound_messages_tenant_id_person_id_idx" ON "outbound_messages"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "outbound_messages_tenant_id_promise_id_idx" ON "outbound_messages"("tenant_id", "promise_id");

-- CreateIndex
CREATE INDEX "payment_promises_tenant_id_case_id_idx" ON "payment_promises"("tenant_id", "case_id");

-- CreateIndex
CREATE INDEX "payment_promises_tenant_id_person_id_idx" ON "payment_promises"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "payment_promises_tenant_id_call_attempt_id_idx" ON "payment_promises"("tenant_id", "call_attempt_id");

-- CreateIndex
CREATE INDEX "scheduled_calls_tenant_id_case_id_idx" ON "scheduled_calls"("tenant_id", "case_id");

-- CreateIndex
CREATE INDEX "scheduled_calls_tenant_id_person_id_idx" ON "scheduled_calls"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "score_events_tenant_id_actor_user_id_idx" ON "score_events"("tenant_id", "actor_user_id");

-- CreateIndex
CREATE INDEX "score_events_tenant_id_call_attempt_id_idx" ON "score_events"("tenant_id", "call_attempt_id");

-- Data-integrity CHECKs.

-- A case is closed exactly when it reaches a terminal status.
ALTER TABLE "collection_cases" ADD CONSTRAINT collection_cases_closed_iff_terminal
  CHECK (("status" IN ('PAID', 'CLOSED_UNRESOLVED')) = ("closed_at" IS NOT NULL));

-- Late-payment interest rates are annual percentages.
ALTER TABLE "bookings" ADD CONSTRAINT bookings_interest_rate_range
  CHECK ("late_payment_interest_rate_pa" IS NULL OR "late_payment_interest_rate_pa" BETWEEN 0 AND 100);
ALTER TABLE "collection_policies" ADD CONSTRAINT collection_policies_interest_rate_range
  CHECK ("default_late_interest_rate_pa" IS NULL OR "default_late_interest_rate_pa" BETWEEN 0 AND 100);
