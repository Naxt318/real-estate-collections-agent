# Collections Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full collections schema from the spec — CRM-mirrored and platform-owned tables, every one tenant-isolated by RLS — plus the cross-tenant job access path and a demo dataset that exercises every demo scenario.

**Architecture:** Prisma owns every table. Each task adds one domain group as one migration: generated DDL plus appended raw SQL for RLS policies, CHECK constraints and grants. Every intra-tenant foreign key is composite `(tenant_id, x_id) → (tenant_id, id)`, so a row can never point at another builder's row, even through paths RLS does not check (FK checks bypass RLS). Cross-tenant jobs go through two narrow `SECURITY DEFINER` functions, never a BYPASSRLS role.

**Tech Stack:** Prisma 7.10.1 + `@prisma/adapter-pg`, PostgreSQL 17, NestJS 12.3.3, Vitest 5.0.5, tsx. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-13-collections-data-model-design.md` (and `CLAUDE.md` §4, §7, §18)

## Prerequisite

Phase 1 Task 6 (`docs/superpowers/plans/2026-11-04-phase-1-saas-foundation.md`) must be merged first. This plan uses what it produces: `test/support/db.ts` (`ownerClient()`, `appClient(opts?)`, `resetDb(owner)`), `TenantTransactionRunner.runAs(tenantId, fn)`, and the `test:integration` script. That plan names Jest, but the repo now runs Vitest: use whatever runner and config Task 6 actually landed. Docker must be running (`pnpm db:up`).

## Global Constraints

- Branch: `feature/collections-data-model`, created from the latest `origin/develop` after the prerequisite is merged. One commit per task minimum. Messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- TDD (CLAUDE.md §18): each task's tests are written and seen failing before its migration exists.
- Naming: Prisma models are PascalCase singular, fields are camelCase with `@map("snake_case")`, and tables are `@@map("snake_case_plural")`, exactly as the spec's table names.
- IDs: `String @id @default(uuid()) @db.Uuid`. `tenantId String @map("tenant_id") @db.Uuid` with FK to `tenants`, `onDelete: Restrict`.
- Money: `Decimal @db.Decimal(14, 2)`, never `Float`. `currency String @default("INR") @db.Char(3)` on every row that owns an amount.
- Timestamps: `@db.Timestamptz(3)` on every new column. Task 1 converts the existing `tenants` and `users` columns too. Calendar dates (`due_date`, `agreed_date`, `booking_date`…) use `@db.Date`.
- `createdAt @default(now())`, plus `updatedAt @updatedAt` on every table except the append-only ones (`sync_runs`, `score_events`, `audit_logs`, `outbox_events`).
- Every relation uses `onDelete: Restrict` (my call: nothing financial cascades).
- Composite tenant FKs: each referenced table gets `@@unique([tenantId, id])`, and each relation is `@relation(fields: [tenantId, xId], references: [tenantId, id])`. The relation to `Tenant` itself stays single-column.
- RLS SQL for every new tenant-owned table, appended to that task's migration, with exactly the predicate of `20261112123603_enable_rls`:

  ```sql
  ALTER TABLE "<t>" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "<t>" FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON "<t>"
    USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  ```

- Migration procedure per task: `pnpm --filter backend exec prisma migrate dev --create-only --name <name>`, then append the raw SQL, then `pnpm db:migrate`.
- **Drift check** (run in every task's verification): `pnpm --filter backend exec prisma migrate dev --create-only --name drift_check` must report that the schema is already in sync and create no folder. If it generates SQL that drops a hand-written index or constraint, express that object in `schema.prisma` instead. For partial unique indexes, check whether Prisma 7.10 supports `where:` on `@@unique`/`@@index`. If it does not, keep the index in raw SQL and confirm the drift check stays clean.
- Out of scope: repositories, services, the sync, the scheduler, the demo CRM adapter, and API endpoints. This plan stops at schema, migrations, the SQL access path with its typed wrapper, and seed data.

## Review Focus

1. **Cross-tenant references:** a tenant-A row whose FK points at a tenant-B parent, inserted through the owner connection where RLS doesn't apply, must fail with a foreign-key violation. Tested in Tasks 2, 3 and 6.
2. **A table added later without RLS:** the coverage guard fails for any `public` table with a `tenant_id` column that is missing from `TENANT_TABLES` or lacks a forced `tenant_isolation` policy. Tested in Task 1 and grown by every task.
3. **Re-sync duplicates:** the same `(source, externalId)` twice in one tenant fails with `P2002`; the same pair in another tenant succeeds. Tested in Task 2.
4. **Bad money:** a negative amount, an `expected_bank_amount` above `amount_due`, and a value with more than 2 decimal places are all rejected or exactly preserved, never silently rounded through a float. Tested in Task 4.
5. **The SECURITY DEFINER path:** it must not be callable by `PUBLIC`, must pin `search_path`, must not return SUSPENDED tenants, and must return nothing for an unknown connection id. Tested in Task 9.

---

### Task 1: Coverage guard, user roles, timestamptz

**Files:**
- Create: `apps/backend/test/schema/schema-guard.int-spec.ts`, `apps/backend/prisma/migrations/*_user_roles_timestamptz/migration.sql`
- Modify: `apps/backend/prisma/schema.prisma`, `apps/backend/test/support/db.ts` (`resetDb`)

**Interfaces:**
- Produces:
  - `export const TENANT_TABLES: readonly string[]` in `schema-guard.int-spec.ts`. It starts as `['tenants', 'users']`, and every later task appends its tables.
  - `enum UserRole { ADMIN COLLECTIONS_LEAD AGENT }` and `User.role UserRole @default(AGENT)` (my call: least privilege by default).
  - `resetDb(owner)` truncates **every** table in schema `public` except `_prisma_migrations`, read from `pg_tables` with `TRUNCATE … CASCADE`, so later tasks never edit it.

- [ ] **Step 1: Write the failing tests** in `schema-guard.int-spec.ts`, querying the catalog with `ownerClient()`:
  - `every listed table has forced RLS and a tenant_isolation policy`: for each name in `TENANT_TABLES`, `pg_class.relrowsecurity` and `relforcerowsecurity` are both `true`, and `pg_policies` has `policyname = 'tenant_isolation'` for it.
  - `every table with a tenant_id column is listed`: the set of `information_schema.columns` tables with `column_name = 'tenant_id'` (schema `public`) ⊆ `TENANT_TABLES`.
  - `no money is stored as float`: zero `public` columns have `data_type IN ('real', 'double precision')`.
  - `all timestamps carry a time zone`: zero `public` columns (excluding `_prisma_migrations`) have `data_type = 'timestamp without time zone'`.
  - `users.role defaults to AGENT`: insert a user without a role through the owner client and read back `role === 'AGENT'`.
- [ ] **Step 2:** Run `pnpm test:integration -- schema-guard`. Expected: FAIL on the timestamp and role cases.
- [ ] **Step 3:** Add `UserRole`, `User.role`, and `@db.Timestamptz(3)` on `Tenant`/`User` timestamps. Create the migration and check that the generated `ALTER COLUMN … TYPE TIMESTAMPTZ(3)` includes `USING "<col>" AT TIME ZONE 'UTC'` (add it if Prisma omits it, so existing values stay correct). Rewrite `resetDb` as above.
- [ ] **Step 4:** Run the integration and unit suites. Expected: PASS. Then run the drift check.
- [ ] **Step 5:** Commit `feat(db): add user roles, timestamptz and schema coverage guard`.

### Task 2: Catalog mirror: projects, towers, units

**Files:**
- Create: `apps/backend/test/schema/catalog.int-spec.ts`, migration `*_catalog_mirror`
- Modify: `schema.prisma`, `schema-guard.int-spec.ts` (`TENANT_TABLES` += `projects`, `towers`, `units`)

**Interfaces:**
- Produces: `enum CrmSource { DEMO SALESFORCE }`. Models `Project`, `Tower` and `Unit` with the spec §5.1 fields, plus the mirror columns every later mirrored model repeats: `source CrmSource`, `externalId String @map("external_id")`, `lastSyncedAt DateTime @map("last_synced_at") @db.Timestamptz(3)`, `rawPayload Json? @map("raw_payload")`, `@@unique([tenantId, source, externalId])`, `@@unique([tenantId, id])`. `Unit.towerId` is optional, and `Unit.carpetAreaSqft` is `Decimal? @db.Decimal(10, 2)`.

- [ ] **Step 1: Write the failing tests** (owner client unless stated):
  - `re-sync upsert key is unique per tenant`: creating two projects in tenant A with `source: 'DEMO', externalId: 'P-1'` rejects with `P2002`. The same pair in tenant B succeeds.
  - `unit cannot reference another tenant's project`: create a project in B, then a unit with `tenantId: A, projectId: <B's project>`. It rejects with `P2003`.
  - `unit without a tower is allowed`: `towerId: null` succeeds.
  - `app user sees only its tenant's projects`: with one project per tenant, `runAs(A, tx => tx.project.findMany())` returns exactly A's project.
- [ ] **Step 2:** Run. Expected: FAIL (the models don't exist yet, so the test file doesn't compile, and the guard fails on the missing tables).
- [ ] **Step 3:** Add the enum, the models and the migration with RLS SQL for the three tables.
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): mirror projects, towers and units from the CRM`.

### Task 3: People and bookings: persons, bookings, booking_applicants

**Files:**
- Create: `apps/backend/test/schema/bookings.int-spec.ts`, migration `*_bookings_mirror`
- Modify: `schema.prisma`, `TENANT_TABLES` += `persons`, `bookings`, `booking_applicants`

**Interfaces:**
- Consumes: the mirror columns convention from Task 2.
- Produces:
  - Enums `PlanType`, `BookingStatus` and `ApplicantRole` with the exact values in spec §5.1, plus `CommunicationChannel { EMAIL SMS }`.
  - `Person`: the mirror columns; `fullName`, `primaryPhone`, `altPhone?`, `email?`, `preferredLanguage?`; and the platform-owned columns `doNotCall Boolean @default(false)`, `optedOutAt DateTime?`, `preferredChannel CommunicationChannel?`.
  - `Booking`: the spec §5.1 fields. `agreementValue` is Decimal(14,2), `latePaymentInterestRatePa` is `Decimal? @db.Decimal(5, 2)`, and `hasHomeLoan Boolean @default(false)`. `primaryContactPersonId` is a composite FK to `Person`.
  - `BookingApplicant`: `bookingId`, `personId`, `role`, `callOrder Int`, `@@unique([bookingId, personId])`. It carries no mirror columns (my call: the sync derives it from the booking record).
  - Raw SQL CHECKs: `persons_primary_phone_e164 CHECK (primary_phone ~ '^\+[1-9][0-9]{6,14}$')`, the same rule on `alt_phone` when not null, `booking_applicants_call_order_positive CHECK (call_order >= 1)`, and `bookings_amounts_non_negative CHECK (agreement_value >= 0)`.

- [ ] **Step 1: Write the failing tests:**
  - `phone must be E.164`: `'9876543210'` rejects (check violation, Postgres code `23514`), and `'+919876543210'` succeeds.
  - `a person can hold two bookings and a booking can have two applicants`: create both, and read back two `BookingApplicant` rows ordered by `callOrder` as `PRIMARY` then `CO_APPLICANT`.
  - `the same person cannot be added twice to one booking`: rejects with `P2002`.
  - `call_order must be positive`: `0` rejects with `23514`.
  - `booking cannot name another tenant's person as primary contact`: rejects with `P2003`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the models, migration, RLS and CHECKs.
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): mirror persons, bookings and applicants`.

### Task 4: Money mirror: demands, payments

**Files:**
- Create: `apps/backend/test/schema/demands.int-spec.ts`, `apps/backend/test/support/graph.ts`, migration `*_demands_payments_mirror`
- Modify: `schema.prisma`, `TENANT_TABLES` += `demands`, `payments`

**Interfaces:**
- Produces:
  - Enums `DemandStatus` and `PayerType`, values exactly as in spec §5.1.
  - `Demand`: the spec fields. `stageSequence Int`, `amountDue`, `expectedBankAmount?` and `crmOutstanding?` are all Decimal(14,2). `demandDate` and `dueDate` are `@db.Date`.
  - `Payment`: the spec fields. `demandId` is an optional composite FK, and `paidAt` is Timestamptz.
  - CHECKs: `demands_amount_due_non_negative (amount_due >= 0)`, `demands_bank_share_within_due (expected_bank_amount IS NULL OR (expected_bank_amount >= 0 AND expected_bank_amount <= amount_due))`, `payments_amount_positive (amount > 0)`.
  - `test/support/graph.ts`: `createBookingGraph(owner: PrismaClient, tenantId: string, opts?: { hasHomeLoan?: boolean; amountDue?: string; expectedBankAmount?: string | null }): Promise<{ projectId: string; unitId: string; personId: string; bookingId: string; demandId: string }>`. It creates one of each with source `DEMO`, unique external ids, and a demand due 10 days ago. Defaults: `amountDue: '620000.00'`, no loan. Later tasks reuse it.

- [ ] **Step 1: Write the failing tests:**
  - `money keeps exact paise`: a demand with `amountDue: '620000.10'` reads back with `.toString() === '620000.1'` as a `Prisma.Decimal`. Two payments of `'0.10'` and `'0.20'` aggregate with `_sum` to exactly `'0.3'`.
  - `more than two decimals is not stored silently`: `amountDue: '1.005'` either rejects or reads back `'1.01'`. Assert whichever Postgres actually does (it rounds `numeric(14,2)`), and record it in a comment so the sync knows rounding happens in the database.
  - `negative amount_due rejects` and `zero payment rejects`: both fail with `23514`.
  - `bank share above amount_due rejects` (`expectedBankAmount: '700000'` against `'620000'`): fails with `23514`.
  - `payment without a demand is allowed` (`demandId: null`): succeeds.
  - `payment cannot point at another tenant's demand`: fails with `P2003`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the models, migration, RLS, CHECKs and the index `@@index([tenantId, status, dueDate])` on demands and `@@index([tenantId, demandId])` on payments (spec §5.3).
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): mirror demands and payments with decimal money`.

### Task 5: Integration and policy: integration_connections, sync_runs, collection_policies, cadence_steps, approved_talking_points

**Files:**
- Create: `apps/backend/test/schema/policy.int-spec.ts`, migration `*_integration_and_policy`
- Modify: `schema.prisma`, `TENANT_TABLES` += the five tables

**Interfaces:**
- Produces:
  - `IntegrationConnection`: `source`, `status IntegrationStatus { ACTIVE DISABLED ERROR }`, `secretRef String`, `config Json @default("{}")`, `lastSuccessAt?`, `@@unique([tenantId, source])`.
  - `SyncRun`: the spec fields, plus `status SyncRunStatus { RUNNING SUCCEEDED FAILED }`, `counts Json @default("{}")`, `error String?`. It has no `updatedAt`.
  - `CollectionPolicy`, `@@unique([tenantId])`, with these defaults written into the schema (spec, decided):
    - `maxPromiseDeferralDays Int @default(15)`
    - `callingWindowStart @db.Time(0)` (`'10:00'`) and `callingWindowEnd @db.Time(0)` (`'19:00'`)
    - `timezone String @default("Asia/Kolkata")` (my call: makes "IST" explicit)
    - `maxCallAttemptsPerCase Int @default(6)`
    - `contactRiskSkipThreshold Int @default(70)`
    - `defaultLateInterestRatePa Decimal? @db.Decimal(5, 2)`

    Prisma cannot default a `Time` column. Set the two time defaults in the migration SQL: `ALTER COLUMN … SET DEFAULT '10:00'` (and `'19:00'`). If the drift check then fights you, drop the SQL defaults and make the seed always supply both times.
  - `CadenceStep`: `dayOffset Int`, `repeatEveryDays Int?`, `@@unique([tenantId, dayOffset])`.
  - `ApprovedTalkingPoint`: `key String`, `text String`, `requiresHomeLoan Boolean @default(false)`, `active Boolean @default(true)`, `@@unique([tenantId, key])`.
  - CHECKs:
    - `contact_risk_skip_threshold BETWEEN 0 AND 100`
    - `max_promise_deferral_days >= 0`
    - `max_call_attempts_per_case >= 1`
    - `calling_window_start < calling_window_end`
    - `repeat_every_days IS NULL OR repeat_every_days >= 1`

- [ ] **Step 1: Write the failing tests:**
  - `policy defaults match the approved values`: create a policy with only `tenantId` and read back 15, 10:00, 19:00, `Asia/Kolkata`, 6 and 70.
  - `one policy per tenant`: a second policy in the same tenant fails with `P2002`.
  - `invalid policy values reject`: threshold `101`, window `19:00–10:00` and attempts `0` each fail with `23514`.
  - `one connection per source per tenant`: fails with `P2002`.
  - `cadence offsets are unique per tenant`: a duplicate `dayOffset: 0` fails with `P2002`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the models, migration, RLS and CHECKs.
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): add integration connections, sync runs and collection policy`.

### Task 6: Collection work: collection_cases, case_demands, scheduled_calls, call_attempts

**Files:**
- Create: `apps/backend/test/schema/cases.int-spec.ts`, migration `*_collection_cases_calls`
- Modify: `schema.prisma`, `TENANT_TABLES` += the four tables

**Interfaces:**
- Consumes: `createBookingGraph` (Task 4).
- Produces:
  - Enums `CaseStatus` and `CallOutcome` with the exact spec values, plus `HandledBy { AI HUMAN }`, `ScheduledCallStatus { PENDING DISPATCHED CANCELLED SKIPPED }` and `Hostility { NONE MILD HIGH ABUSIVE }`.
  - `CollectionCase`: `personId`, `status @default(OPEN)`, `handledBy @default(AI)`, `attemptsCount Int @default(0)`, `nextActionAt?`, `closedAt?`.
  - `CaseDemand`: `caseId`, `demandId`, `addedAt @default(now())`, `removedAt?`.
  - `ScheduledCall`: `caseId`, `personId`, `scheduledFor`, `status @default(PENDING)`, `skipReason String?`. `skipReason` is free text; `LOAN_SPLIT_UNKNOWN` is one of its values.
  - `CallAttempt`: the spec fields. `scheduledCallId` is optional, `hostility` defaults to `NONE`, and `outcome` is optional.
  - Partial unique indexes:
    - `collection_cases_one_open_per_person UNIQUE (tenant_id, person_id) WHERE closed_at IS NULL`
    - `case_demands_one_active_case UNIQUE (tenant_id, demand_id) WHERE removed_at IS NULL`

    Closing a case must also set `removed_at` on its `case_demands`. That's application logic for a later plan; record it as a comment in the migration.
  - Indexes `(tenantId, status)` on cases, `(tenantId, demandId)` on case_demands, and `(tenantId, status, scheduledFor)` on scheduled_calls.

- [ ] **Step 1: Write the failing tests:**
  - `one open case per person`: a second open case for the same person fails with `P2002` (or `23505` raw). After the first gets `closedAt`, a new open case succeeds.
  - `a demand is active in at most one case`: linking the same demand to two cases with `removedAt` null fails. After `removedAt` is set on the first link, the second succeeds.
  - `a combined case holds demands from two bookings`: one person, two booking graphs, one case, two `CaseDemand` rows. Both insert.
  - `case cannot reference another tenant's person`: fails with `P2003`.
  - `call attempt defaults`: `hostility === 'NONE'`, `outcome === null`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the models, migration, RLS and partial indexes (following the drift-check rule in Global Constraints).
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): add collection cases, case demands and calls`.

### Task 7: Outcomes: payment_promises, outbound_messages, escalations

**Files:**
- Create: `apps/backend/test/schema/outcomes.int-spec.ts`, migration `*_promises_messages_escalations`
- Modify: `schema.prisma`, `TENANT_TABLES` += the three tables

**Interfaces:**
- Produces:
  - Enums `PromiseStatus`, `EscalationReason` and `EscalationStatus` with the exact spec values, plus `MessageStatus { SCHEDULED SENT DELIVERED FAILED }`.
  - `PaymentPromise`: the spec fields with **no** `demandId` (decided: a promise covers the case). `proposedDate` and `agreedDate` are `@db.Date`, `agreedAmount` is Decimal(14,2), and `status` defaults to `PENDING`.
  - `OutboundMessage`: the spec fields. `channel CommunicationChannel` (from Task 3), `amount` Decimal(14,2), `paymentLinkUrl String`, `promiseId?`.
  - `Escalation`: the spec fields. `assignedToUserId` is an optional composite FK to `User` (add `@@unique([tenantId, id])` to `User`).
  - CHECKs: `agreed_amount > 0`, `outbound_messages.amount > 0`, `agreed_date >= proposed_date OR proposed_date IS NULL`.

    The last one is my call: a negotiation never ends later than the buyer's first ask. If that's wrong, drop it and tell the founder.
  - Indexes `(tenantId, status, agreedDate)` on promises and `(tenantId, status, createdAt)` on escalations.

- [ ] **Step 1: Write the failing tests:**
  - `promise defaults to PENDING and keeps exact amount`: `agreedAmount: '120000.00'` reads back exactly.
  - `zero promise amount rejects`: fails with `23514`.
  - `escalation can be assigned only to a same-tenant user`: B's user id fails with `P2003`, and A's succeeds.
  - `message links to its promise`: a message with `promiseId` round-trips.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the models, migration, RLS and CHECKs.
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): add payment promises, outbound messages and escalations`.

### Task 8: Scores and platform logs: risk_scores, score_events, audit_logs, outbox_events

**Files:**
- Create: `apps/backend/test/schema/scores.int-spec.ts`, migration `*_scores_audit_outbox`
- Modify: `schema.prisma`, `TENANT_TABLES` += the four tables

**Interfaces:**
- Produces:
  - Enums `ScoreKind { CONTACT PAYMENT }`, `RiskBand { LOW MEDIUM HIGH INSUFFICIENT_HISTORY }` and `ScoreSource { RULE AI HUMAN }`.
  - `RiskScore`: `personId`, `kind`, `value Int`, `band`, `@@unique([tenantId, personId, kind])`.
  - `ScoreEvent`: the spec fields. `delta Int` and `valueAfter Int`; `actorUserId?` and `callAttemptId?` are optional composite FKs.
  - `AuditLog`: `actorUserId?`, `action`, `entityType`, `entityId String @db.Uuid`, `before Json?`, `after Json?`.
  - `OutboxEvent`: `type`, `payload Json`, `processedAt?`.
  - CHECKs: `risk_scores.value BETWEEN 0 AND 100` and `score_events.value_after BETWEEN 0 AND 100`.
  - Grants SQL: `REVOKE UPDATE, DELETE ON "score_events", "audit_logs" FROM app_user;`. Both tables are append-only for the app role, and `outbox_events` stays updatable.
  - Indexes `(tenantId, personId, createdAt)` on score_events and `(tenantId, processedAt)` on outbox_events.

- [ ] **Step 1: Write the failing tests:**
  - `one score per person per kind`: fails with `P2002`.
  - `score outside 0–100 rejects`: `101` fails with `23514`.
  - `app user cannot rewrite history`: inside `runAs(A)`, updating a `score_events` row and deleting an `audit_logs` row each reject with permission denied (`42501`). Inserting both succeeds.
  - `app user can mark outbox processed`: updating `processedAt` inside `runAs(A)` succeeds.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the models, migration, RLS, CHECKs and REVOKE.
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): add risk scores, score events, audit log and outbox`.

### Task 9: Cross-tenant job access path

**Files:**
- Create: migration `*_system_access_functions`, `apps/backend/src/infrastructure/database/system-directory.ts`, `apps/backend/test/schema/system-directory.int-spec.ts`
- Modify: `apps/backend/src/infrastructure/database/database.module.ts` (provide and export `SystemDirectory`)

**Interfaces:**
- Produces:
  - SQL `app_active_tenant_ids() RETURNS SETOF uuid`: `SELECT id FROM tenants WHERE status = 'ACTIVE' ORDER BY id`.
  - SQL `app_resolve_integration_connection(p_connection_id uuid) RETURNS TABLE (tenant_id uuid, source "CrmSource", secret_ref text, status "IntegrationStatus")`: at most one row.
  - Both functions: `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp`, owned by the migration role, with `REVOKE ALL ON FUNCTION … FROM PUBLIC; GRANT EXECUTE ON FUNCTION … TO app_user;`.
  - `class SystemDirectory` (`@Injectable`, constructor `(prisma: PrismaService)`):
    - `listActiveTenantIds(): Promise<string[]>`
    - `resolveIntegrationConnection(connectionId: string): Promise<{ tenantId: string; source: CrmSource; secretRef: string; status: IntegrationStatus } | null>`

    It calls the functions with `$queryRaw` and **never** sets `app.tenant_id`. A non-UUID `connectionId` returns `null` without querying.

- [ ] **Step 1: Write the failing tests** (app client, no tenant context):
  - `lists active tenants only`: seed A and B as ACTIVE and C as SUSPENDED. The result equals `[A, B]` sorted. In the same session, `tenant.findMany()` still returns `[]`.
  - `resolves a connection without tenant context`: it returns `{ tenantId: A, source: 'DEMO', … }`. An unknown uuid returns `null`, and `'not-a-uuid'` returns `null`.
  - `functions are locked down`: `pg_proc.prosecdef` is true, `proconfig` contains `search_path=public, pg_temp`, and `has_function_privilege('public', '<fn>', 'EXECUTE')` is false for both.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Write the migration and `SystemDirectory`, and register the provider.
- [ ] **Step 4:** Tests PASS, then run the drift check.
- [ ] **Step 5:** Commit `feat(db): add security-definer tenant directory for background jobs`.

### Task 10: Demo dataset seed

**Files:**
- Create: `apps/backend/prisma/seed/demo-ids.ts`, `apps/backend/prisma/seed/demo-dataset.ts`, `apps/backend/prisma/seed/apply-demo-dataset.ts`, `apps/backend/prisma/seed/demo-dataset.spec.ts`, `apps/backend/test/schema/seed.int-spec.ts`
- Modify: `apps/backend/prisma/seed.ts` (orchestrates only), `apps/backend/vitest.config.ts` (`include` += `prisma/**/*.spec.ts`)

**Interfaces:**
- Produces:
  - `demoUuid(...parts: string[]): string`: a deterministic RFC 4122 v5-style UUID from SHA-1 of `parts.join(':')` (`node:crypto`). The same parts always give the same id, so the seed is idempotent.
  - `type DemoTenantKey = 'A' | 'B'`. The tenant ids and names stay as they are in the current `seed.ts`.
  - `buildDemoDataset(tenant: DemoTenantKey, asOf: Date): DemoDataset`. It's pure, and returns plain create-inputs keyed by model (`projects`, `towers`, `units`, `persons`, `bookings`, `bookingApplicants`, `demands`, `payments`, `integrationConnections`, `collectionPolicies`, `cadenceSteps`, `approvedTalkingPoints`, `collectionCases`, `caseDemands`, `callAttempts`, `paymentPromises`, `escalations`, `riskScores`, `scoreEvents`, `users`). Every amount is a decimal string. Every date is relative to `asOf`, so the demo is always overdue.
  - `applyDemoDataset(owner: PrismaClient, dataset: DemoDataset): Promise<void>`: upserts by id, in FK order.
  - Builder A scenarios (project `DEMO — Skyline Residency`, Mumbai, Maharashtra, RERA no. `DEMO-P51800000001`, towers A and B; all `source: DEMO`):

    | Buyer | Scenario | Data |
    |---|---|---|
    | Asha Rao | cooperative hero | CLP, no loan; demand "Slab 8", ₹6,20,000, due `asOf − 12d` |
    | Vikram & Neha Mehta | joint + loan with split | primary Vikram, co-applicant Neha; loan "DEMO Bank"; demand ₹6,20,000, `expectedBankAmount` ₹5,00,000; BANK payment ₹5,00,000 → buyer owes ₹1,20,000 |
    | Rohan Das | loan, split unknown | `hasHomeLoan: true`, `expectedBankAmount: null` |
    | Priya Nair | combined call | two bookings, two overdue demands, one open case with two `caseDemands` |
    | Anil Kapoor | partial payment | demand ₹6,20,000, BUYER payment ₹2,00,000, status `PARTIALLY_PAID` |
    | Karan Singh | serial promise-breaker | two `BROKEN` promises; PAYMENT risk `HIGH` (value 75) with two `scoreEvents` reasons "promise broken" |
    | Suresh Iyer | hostile | a call attempt with `hostility: ABUSIVE`; CONTACT risk 80 (above the 70 threshold) with a matching score event |
    | Meera Joshi | dispute | an OPEN escalation, reason `DISPUTE`; case status `ESCALATED`, `handledBy: HUMAN` |

    Also for Builder A:
    - one `DEMO` integration connection (`secretRef: 'demo-no-secret'`)
    - a default policy and cadence steps `-3`, `0`, `5` (repeat every 5)
    - talking points `late-interest` (`requiresHomeLoan: false`) and `loan-impact` (`requiresHomeLoan: true`)
    - users `demo-a1` as ADMIN and `demo-a2` as COLLECTIONS_LEAD

    Builder B: one project, two persons, one overdue demand, policy and cadence. Its users are `demo-b1` (ADMIN) and `demo-b2` (COLLECTIONS_LEAD).

- [ ] **Step 1: Write failing unit tests** (`demo-dataset.spec.ts`):
  - `demoUuid is deterministic and valid`: the same parts give the same value, different parts give different values, and the result matches the UUID regex.
  - `every scenario is present for A`: assert each row of the table above by person name and its distinguishing field (e.g. Rohan's booking `hasHomeLoan && expectedBankAmount === null`, and Priya's case has 2 caseDemands).
  - `amounts are consistent`: for every demand, the sum of its payments ≤ `amountDue`, and `expectedBankAmount ≤ amountDue`. All amounts match `/^\d+\.\d{2}$/`.
  - `no row references another tenant`: every `tenantId` in `buildDemoDataset('B', d)` is B's id.
  - `dates move with asOf`: Asha's demand `dueDate` equals `asOf − 12 days`.
- [ ] **Step 2: Write the failing integration test** (`seed.int-spec.ts`): run `applyDemoDataset` for A and B twice. Row counts after the second run equal the counts after the first. As app user, `runAs(B, tx => tx.person.findMany())` contains no A names.
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement `demo-ids.ts`, `demo-dataset.ts` and `apply-demo-dataset.ts`, and slim `seed.ts` down to: for each tenant key, `applyDemoDataset(owner, buildDemoDataset(key, new Date()))`, then print the tenant ids.
- [ ] **Step 5:** Tests PASS. Then `pnpm --filter backend exec prisma migrate reset --force` succeeds from zero and reseeds. Run `pnpm db:seed` a second time; it must exit 0.
- [ ] **Step 6:** Full verification: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm format:check` all exit 0, and the drift check is clean.
- [ ] **Step 7:** Commit `feat(db): seed demo dataset covering every collections scenario`.
