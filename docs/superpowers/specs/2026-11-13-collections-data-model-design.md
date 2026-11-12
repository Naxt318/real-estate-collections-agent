# Collections Data Model Design

## Context

`CLAUDE.md` §7 lists generic models (Payment, PaymentSchedule, CallLog…). This document replaces that list with a schema shaped around how Indian real-estate collections actually work, and around what this product actually does.

The product, in the founder's words: pull payment data from the builder's CRM, call the buyers who owe money, understand their situation, agree a payment date, nudge them with the **CRM's own payment link**, and learn from the CRM whether they paid. We never take money ourselves.

Status: pre-revenue prototype for builder demos. No client CRM access yet. Lodha (Salesforce) is the first target. The schema must still be multi-tenant and production-shaped, because builders will judge it as a product.

**Deliverable of this spec (my call):** the Prisma schema, migrations, RLS policies, the cross-tenant job access path (section 4), and a demo seed. The demo loop (section 3) and state flow (section 6) are described so the schema supports them; building the scheduler, calls, nudges and the demo CRM adapter are later plans that build on this one.

Decisions in this document are marked **(decided)** when the founder made them, and **(my call)** when Claude chose a default the founder has not reviewed.

## 1. Domain background

Researched from RERA material and developer/lender guides; not legal advice.

- **Agreement for sale.** RERA §13 caps the advance at 10% of the cost before a registered agreement for sale. The agreement fixes the payment plan.
- **Construction-linked plan (CLP).** Most instalments are tied to construction stages (plinth, each slab, brickwork, finishing, possession), not to dates. When a stage completes, the builder issues a **demand letter**; the due date runs from that letter. Other plan types exist: time-linked, 10:90, subvention.
- **Home loans.** The bank lends to the buyer but disburses directly to the builder against each demand letter, often under a tripartite agreement. One demand may be paid partly by the bank and partly by the buyer.
- **Interest.** RERA §19(6)–(7): the buyer pays dues on time and owes interest when late. §18: the builder owes interest if possession is late. Rates come from state RERA rules and the agreement; they vary by state.

## 2. Goals, non-goals, anti-goals

**Goals**
- One schema for every builder; a new builder is new data and maybe a new CRM adapter, never a migration. **(decided)**
- Support the demo loop end to end (section 3).
- Show "where the AI is" for every overdue demand, and what share of buyers the AI handles without a human.
- Tenant isolation by `tenant_id` + PostgreSQL RLS on every tenant-owned table.

**Non-goals (this version)**
- Our own payment gateway. Payment links and payment confirmation come from the CRM. **(decided)**
- Raising demand letters or tracking construction progress. The CRM raises demands; we pull them. **(decided)**
- Refunds, booking cancellation workflows, GST / stamp-duty breakdowns, multi-currency, builder-side delay-possession interest (§18). **(my call)**

**Anti-goals (would be failure even if it works)**
- The AI states an amount, date, interest rate or payment status that did not come from the CRM or builder policy.
- The AI tells a buyer late payment will hurt their credit score when no home loan is involved (see section 7).
- We mark a demand paid because a buyer said so on a call.
- One builder's data visible to another, through any path.

## 3. The demo loop

1. Demo CRM holds a buyer with an overdue demand ("8th slab, ₹6,20,000, 12 days late").
2. The scheduler finds it, applies cadence and policy, and schedules a call.
3. The AI calls the primary applicant (falls back to co-applicant), handles cooperative, angry, abusive, disputing and hardship buyers. Abuse, disputes, hardship and out-of-limit dates go to the collections lead's queue.
4. The call ends with a promise: agreed date (within the builder's limit) and amount.
5. On the agreed date, we send an email nudge with the CRM payment link for that amount.
6. The demo CRM fires a "paid" event. The demand shows paid, the promise KEPT, the dashboard updates.

## 4. Tenancy model **(decided)**

Shared database, shared tables, `tenant_id` on every tenant-owned row, RLS policies identical to the existing `enable_rls` migration (`tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid`, ENABLE + FORCE).

**Background jobs and webhooks under RLS (my call).** `app_user` stays NOBYPASSRLS and every business query runs inside a tenant-scoped transaction. Jobs that span builders (scheduler, sync, outbox) only need the list of active tenants: a `SECURITY DEFINER` function `app_active_tenant_ids()` owned by a privileged role returns it, and the job then processes each tenant in its own transaction with `app.tenant_id` set (CLAUDE.md §4 rule 5). No second application role with BYPASSRLS. CRM webhooks use a per-connection URL (`/api/v1/integrations/{connectionId}/webhook`); the connection row is resolved by the same kind of narrow SECURITY DEFINER lookup, the signature is verified with that tenant's secret, and only then is tenant context set.

Database-per-builder was considered and rejected for now: N migrations, per-instance Cloud SQL cost, awkward with Prisma. Upgrade path: because the schema is identical for every tenant, a builder who contractually requires a dedicated database can be moved to its own instance as a deployment change.

## 5. Tables

Conventions for every table below unless stated:
- `id` UUID PK; `tenant_id` UUID FK → `tenants`, `ON DELETE RESTRICT`; `created_at`, `updated_at`.
- Prisma camelCase fields mapped to snake_case columns and tables, as in the existing schema.
- Money is `Decimal(14,2)` with a `currency CHAR(3) DEFAULT 'INR'` on the row that owns the amount. Never float.
- RLS enabled and forced.

### 5.1 Mirrored from the CRM (read-only to the app)

The sync job is the only writer. Business code and the AI never modify these rows. Every mirrored table also has:

- `source` — enum `CrmSource { DEMO, SALESFORCE }` (grows with adapters)
- `external_id` TEXT — the CRM's ID
- `last_synced_at` TIMESTAMP
- `raw_payload` JSONB — the unmapped CRM record, for debugging and future mapping; never read for money or business decisions
- `UNIQUE (tenant_id, source, external_id)` — makes re-sync an upsert, never a duplicate

| Table | Key fields | Notes |
|---|---|---|
| `projects` | name, city, state, rera_registration_no | `state` matters: interest rules are state-specific |
| `towers` | project_id, name | Optional grouping; units may have `tower_id` null |
| `units` | project_id, tower_id?, unit_number, floor?, carpet_area_sqft? (Decimal) | |
| `persons` | full_name, primary_phone (E.164), alt_phone?, email?, preferred_language? | A buyer. One person can hold many bookings. |
| `bookings` | unit_id, plan_type, status, booking_date, agreement_date?, agreement_value, currency, has_home_loan, lender_name?, late_payment_interest_rate_pa? (Decimal %), primary_contact_person_id | `has_home_loan` gates the credit-impact talking point |
| `booking_applicants` | booking_id, person_id, role, call_order | Join table. `UNIQUE (booking_id, person_id)` |
| `demands` | booking_id, stage_name (TEXT), stage_sequence (INT), demand_date, due_date, amount_due, expected_bank_amount?, crm_outstanding?, status, currency | One row per raised demand letter. Stage is free text, not an enum, because builders name stages differently. `expected_bank_amount` is the lender's tranche when the CRM records the split. |
| `payments` | booking_id, demand_id?, amount, currency, paid_at, payer_type, reference? | Mirror of CRM-recorded receipts. `demand_id` null when the CRM does not allocate. |

Enums:
- `PlanType { CONSTRUCTION_LINKED, TIME_LINKED, DOWN_PAYMENT, SUBVENTION, OTHER }`
- `BookingStatus { ACTIVE, CANCELLED, POSSESSION_HANDED_OVER }`
- `ApplicantRole { PRIMARY, CO_APPLICANT }` **(decided: one primary contact, fallback to co-applicant)**
- `DemandStatus { RAISED, PARTIALLY_PAID, PAID, WITHDRAWN }` — `WITHDRAWN` when the CRM cancels or the record disappears upstream
- `PayerType { BUYER, BANK, OTHER }`

**Outstanding on a demand** = `amount_due − sum(payments.amount where demand_id = this)`, computed in the backend. When the CRM also reports `crm_outstanding` and the two disagree, the sync records a mismatch on the `sync_runs` row and the CRM figure wins for display and for the AI. **(decided)**

**Buyer's share (decided: the AI chases only the buyer's share).** Buyer share = `amount_due − coalesce(expected_bank_amount, 0)`. Buyer outstanding = buyer share − payments on that demand with `payer_type = BUYER`. A demand on a booking with `has_home_loan = true` and `expected_bank_amount` null is **not called on**: the scheduler records `skip_reason = LOAN_SPLIT_UNKNOWN` and the demand appears on the dashboard for a human. Bank tranches still count toward the demand's paid status.

**Paid status (my call, follows "CRM is the ledger"):** a demand is paid when the CRM's own status says `PAID`. Only if the CRM exposes no status do we derive it: `crm_outstanding = 0`, else computed outstanding ≤ 0. A promise is `KEPT` when buyer payments on the case's demands, dated after the promise was made and on or before `agreed_date`, sum to ≥ `agreed_amount`; `PARTIALLY_KEPT` when some but not all arrived; `BROKEN` when none did.

### 5.2 Owned by us

**Integration and sync**

| Table | Key fields | Notes |
|---|---|---|
| `integration_connections` | source, status (`ACTIVE`, `DISABLED`, `ERROR`), secret_ref, config JSONB, last_success_at? | `secret_ref` points to Secret Manager; credentials never in the DB. `UNIQUE (tenant_id, source)` |
| `sync_runs` | connection_id, started_at, finished_at?, status (`RUNNING`, `SUCCEEDED`, `FAILED`), counts JSONB, error? | Integration audit trail (CLAUDE.md §12) |

**Users and roles** — extend the existing `users` table:
- Add `role` enum `UserRole { ADMIN, COLLECTIONS_LEAD, AGENT }`. Leads and admins see the escalation queue; enforced in the backend. **(decided: escalations go to the collections team lead)**
- Separate role/permission tables are not needed until a builder asks for custom roles. **(my call)**

**Policy** — all per tenant, editable by `ADMIN`, every change written to `audit_logs`.

| Table | Fields | Default **(decided: defaults approved; builder can change them)** |
|---|---|---|
| `collection_policies` (one row per tenant, `UNIQUE (tenant_id)`) | max_promise_deferral_days | 15 — builder sets it **(decided: fixed limit, beyond it goes to the lead)** |
| | calling_window_start / _end (TIME, IST) | 10:00–19:00, pending legal review |
| | max_call_attempts_per_case | 6, then escalate |
| | contact_risk_skip_threshold (0–100) | 70 — above it, no AI call; escalate directly |
| | default_late_interest_rate_pa? | null — used only when the booking has none; never invented |
| `cadence_steps` | day_offset (INT, relative to due date), repeat_every_days? | -3, 0, then +5 repeating **(decided: builder sets it; this is the default)** |
| `approved_talking_points` | key, text, requires_home_loan (BOOL), active | Builder-approved script fragments the AI may use. See section 7. |

**Collection work**

| Table | Key fields | Notes |
|---|---|---|
| `collection_cases` | person_id, status, handled_by (`AI`, `HUMAN`), attempts_count, next_action_at?, closed_at? | **One open case per person (decided: one combined call).** All of a buyer's due or overdue demands, across all their bookings with that builder, belong to that case. Partial unique index on `(tenant_id, person_id) WHERE closed_at IS NULL`. Drives "where the AI is". Cadence runs off the earliest due date among its open demands. |
| `case_demands` | case_id, demand_id, added_at, removed_at? | Which demands the case covers. A newly raised demand joins the open case; a paid or withdrawn one gets `removed_at`. A demand is in at most one open case. The case is `PAID` when all its demands are paid. |
| `scheduled_calls` | case_id, person_id, scheduled_for, status (`PENDING`, `DISPATCHED`, `CANCELLED`, `SKIPPED`), skip_reason? | Created by the scheduler from cadence and promises. Window, opt-out and contact-risk are re-checked at dispatch. |
| `call_attempts` | scheduled_call_id?, case_id, person_id, provider_call_id?, started_at, ended_at?, duration_sec?, connected (BOOL), outcome?, hostility (`NONE`, `MILD`, `HIGH`, `ABUSIVE`), summary?, transcript_uri? | Transcript stored in Cloud Storage, redacted; only the URI here. |
| `payment_promises` | case_id, person_id, call_attempt_id, proposed_date, agreed_date, agreed_amount, currency, status, resolved_at? | Covers the case's demands as a whole; `agreed_amount` may be less than the total (a partial promise). |
| `outbound_messages` | case_id, person_id, promise_id?, channel (`EMAIL`, `SMS`), payment_link_url, amount, send_at, sent_at?, status (`SCHEDULED`, `SENT`, `DELIVERED`, `FAILED`) | The nudge. Link comes from the CRM adapter. |
| `escalations` | case_id, person_id, call_attempt_id?, reason, status, assigned_to_user_id?, resolution_note?, resolved_at? | The lead's dashboard queue |

Enums:
- `CaseStatus { OPEN, CALL_SCHEDULED, PROMISED, AWAITING_APPROVAL, NUDGED, PAID, ESCALATED, CLOSED_UNRESOLVED }`
- `CallOutcome { PROMISED, PAYMENT_LINK_REQUESTED, CLAIMS_ALREADY_PAID, CALLBACK_REQUESTED, DISPUTE, HARDSHIP, WRONG_NUMBER, NO_ANSWER, BUSY, DECLINED_TO_DISCUSS, OPTED_OUT, ABUSIVE }`
- `PromiseStatus { PENDING_APPROVAL, PENDING, KEPT, PARTIALLY_KEPT, BROKEN, REJECTED }`
- `EscalationReason { ABUSE, DISPUTE, HARDSHIP, HIGH_CONTACT_RISK, PROMISE_BEYOND_LIMIT, MAX_ATTEMPTS_REACHED, BUYER_REQUEST }`
- `EscalationStatus { OPEN, IN_PROGRESS, RESOLVED }`

**Scores** — two separate scores per person. **(decided: contact risk drives whether the AI calls; payment risk is the later "future concept")**

| Table | Key fields | Notes |
|---|---|---|
| `risk_scores` | person_id, kind (`CONTACT`, `PAYMENT`), value (0–100), band (`LOW`, `MEDIUM`, `HIGH`, `INSUFFICIENT_HISTORY`), updated_at | Current value. `UNIQUE (tenant_id, person_id, kind)` |
| `score_events` | person_id, kind, delta, value_after, reason (TEXT), source (`RULE`, `AI`, `HUMAN`), actor_user_id?, call_attempt_id? | Append-only. Every change explains itself; a lead's correction is a `HUMAN` event. |

**Contact preferences** — on `persons` but owned by us, so the sync must not overwrite them: `do_not_call` (BOOL), `opted_out_at?`, `preferred_channel?`. Opt-out applies to the person across all their bookings with that builder. **(decided)** If a CRM also carries DND, the sync may set `do_not_call = true` but never clear it.

**Platform**

| Table | Notes |
|---|---|
| `audit_logs` | actor_user_id?, action, entity_type, entity_id, before JSONB?, after JSONB?, at. Policy changes, escalation resolutions, score corrections. |
| `outbox_events` | type, payload JSONB, created_at, processed_at? — transactional outbox (CLAUDE.md §6.6) for `PaymentReceived`, `PromiseBroken`, `CallCompleted`, `EscalationRaised`. |

### 5.3 Indexes (beyond FKs and the uniques above)

- `demands (tenant_id, status, due_date)` — find due and overdue demands
- `collection_cases (tenant_id, status)`
- `case_demands (tenant_id, demand_id)`
- `scheduled_calls (tenant_id, status, scheduled_for)`
- `payment_promises (tenant_id, status, agreed_date)`
- `escalations (tenant_id, status, created_at)`
- `payments (tenant_id, demand_id)`
- `score_events (tenant_id, person_id, created_at)`

## 6. State flow of a collection case

```text
OPEN ─► CALL_SCHEDULED ─► (call) ─┬─ promise within limit ─► PROMISED ─► NUDGED (on agreed date) ─┬─ CRM paid ─► PAID
                                  ├─ promise beyond limit ─► AWAITING_APPROVAL ─ lead approves ─► PROMISED
                                  ├─ abuse / dispute / hardship ─► ESCALATED                       └─ unpaid after agreed date ─► promise BROKEN ─► CALL_SCHEDULED
                                  └─ no answer / callback ─► CALL_SCHEDULED (next cadence step)
contact risk ≥ threshold, or attempts ≥ max ─► ESCALATED
CRM reports paid at any point ─► PAID
```

- While a promise is `PENDING`, regular cadence calls are paused until the agreed date passes.
- `PAID` is set only by a CRM sync or webhook, never by a call outcome. `CLAIMS_ALREADY_PAID` triggers a sync check, not a status change.
- Leaving `ESCALATED` (my call): the lead resolves the escalation with one of *return to AI* (case → `CALL_SCHEDULED`, `handled_by` back to `AI`), *promise recorded by human* (→ `PROMISED`, stays `HUMAN`), or *close* (→ `CLOSED_UNRESOLVED`). A CRM payment still moves it to `PAID`.
- Initial contact-risk rules (my call, transparent, tunable later): start at 20; `HIGH` hostility +20; `ABUSIVE` +40; `OPTED_OUT` sets `do_not_call` instead of scoring; a connected call with no hostility −5; a lead's correction sets the value directly. Each change is a `score_events` row.
- `handled_by` flips to `HUMAN` when a case escalates. The "AI-handled share" metric = cases closed `PAID` with `handled_by = AI` ÷ all closed cases.

## 7. Conversation guardrails that live in data

- Amounts, dates and status the AI speaks come from `demands`, `payments` and `payment_promises`, never from the model.
- Late-payment interest may be mentioned only at `bookings.late_payment_interest_rate_pa`, else `collection_policies.default_late_interest_rate_pa`; if both are null, the AI does not mention a rate.
- Credit-score and loan-impact arguments are allowed only via `approved_talking_points` with `requires_home_loan = true`, and only when `bookings.has_home_loan = true`. Paying a builder late does not by itself affect a credit score.
- The AI never agrees a date beyond `max_promise_deferral_days`; it records `PENDING_APPROVAL` and escalates.

## 8. Demo CRM adapter

- Implements the same CRM adapter interface the Salesforce adapter will.
- Serves a clearly labelled `DEMO` seed: two tenants, projects with towers, CLP bookings, some with home loans and bank tranches, partial payments, one serial promise-breaker, one hostile buyer, one disputed demand.
- Generates payment links (fake URLs) and exposes a "mark paid" action that emits the same event a real CRM webhook would.

## 9. Deviations from CLAUDE.md (to update after approval)

| CLAUDE.md | Change |
|---|---|
| §7 core models (PaymentSchedule, Payment as ledger, CallLog, AIConversation, CommunicationPreference, Role/Permission, IntegrationConfiguration) | Replaced by section 5: plan is implicit in demands; payments are a CRM mirror; `call_attempts` replaces CallLog/AIConversation; preferences live on `persons`; role is an enum on `users`; `integration_connections` replaces IntegrationConfiguration |
| §8 step 7, §11, Phase 6: our payment gateway abstraction | Dropped. Links and confirmation come from the CRM adapter. |
| §7 "backend is the financial source of truth" | The CRM is the ledger. The backend remains the only thing the AI and dashboard read money from, and it never invents values. |
| §22 no email/SMS marketing | Clarify: transactional payment-link messages after a call are in scope; marketing stays out. SMS requires DLT templates, so the demo uses email. **(decided)** |

## 10. Left to the builder

- Exact Prisma field types where this document gives only intent (e.g. TEXT vs VARCHAR lengths).
- How to split the change into migrations, and RLS migration ordering.
- Sync algorithm details (full vs incremental, deletion detection) for the demo adapter.
- Whether `towers` is worth a table in the first migration or can follow later.
