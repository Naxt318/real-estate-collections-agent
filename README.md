# Real Estate Collections Agent

An **AI collections intelligence and receivables management platform** for real estate developers.

Builders (developers) subscribe to the platform, connect their CRM/ERP, and get a dashboard of what each homebuyer owes, who is at risk of paying late, and how collections are going. An AI voice agent calls homebuyers on the builder's behalf to remind them about milestone instalments, take payment promises, send payment links and pass disputes or hardship cases to a human.

> **Status:** early development, Phase 1 (SaaS foundation). There is no running application yet. See [Progress](#progress).

---

## How it works

1. A builder signs up, which creates an isolated **tenant**, and connects their CRM/ERP.
2. Customers, projects, units, bookings, payment schedules and payment history are synced in.
3. Scheduled jobs find upcoming, due, overdue and partially paid instalments.
4. Each homebuyer gets a transparent, explainable **risk score**.
5. An **AI voice agent** calls the homebuyer: it says it is an AI assistant, explains the instalment, answers questions and offers a payment link when appropriate.
6. The call outcome is recorded (promise, already paid, callback, dispute, hardship, and so on).
7. A payment counts as successful **only after the payment gateway verifies it**, never because the customer said so on a call.
8. The dashboard shows balances, promises, disputes and recovery metrics.

## Tech stack

| Layer            | Technology                                                                     |
| ---------------- | ------------------------------------------------------------------------------ |
| Frontend         | Next.js, React, TypeScript, Tailwind CSS                                       |
| Backend          | NestJS (TypeScript), a modular monolith                                        |
| Database         | PostgreSQL 17 with Row-Level Security                                          |
| ORM / migrations | Prisma                                                                         |
| AI / ML service  | Python, FastAPI, scikit-learn (later phases)                                   |
| LLM              | Google Gemini                                                                  |
| Voice            | Twilio (telephony), Deepgram (STT), Sarvam AI (TTS)                            |
| Cloud            | Google Cloud: Cloud Run, Cloud SQL, Cloud Tasks, Secret Manager, `asia-south1` |
| Tooling          | pnpm workspaces, Node 24, Prettier, Docker                                     |

## Architecture principles

- **Multi-tenant from day one.** Every tenant-owned row has a `tenantId`. The tenant always comes from server-side context and never from frontend input. PostgreSQL RLS adds a second layer of isolation, and cross-tenant access is tested explicitly.
- **The backend owns the money.** Amounts use Decimal, never floats. Balances come from verified transactions, and the payment ledger is auditable. The LLM never invents or calculates financial values.
- **Provider abstraction.** Twilio, Gemini, Deepgram, Sarvam, payment gateways and CRMs sit behind interfaces with factories and adapters, so any provider can be swapped out.
- **Safe outbound calling.** Real calls are off by default (`OUTBOUND_MODE=disabled`). The agent respects opt-outs and calling windows and never asks for OTPs, PINs or card details.

The full product and engineering spec is in [`CLAUDE.md`](CLAUDE.md).

## Progress

### Done

- **Product and engineering spec** ([`CLAUDE.md`](CLAUDE.md)): business model, locked tech stack, multi-tenancy rules, financial data rules, AI and voice safety rules, compliance notes and the delivery phases.
- **Phase 1 design** ([`docs/superpowers/specs/2026-11-04-phase-1-saas-foundation-design.md`](docs/superpowers/specs/2026-11-04-phase-1-saas-foundation-design.md)): folder structure, the two-role RLS design (`app_owner` / `app_user` with `NOBYPASSRLS`), tenant context through `AsyncLocalStorage`, a swappable tenant resolver, transaction-local `app.tenant_id`, the testing strategy and open risks.
- **Phase 1 implementation plan** ([`docs/superpowers/plans/2026-11-04-phase-1-saas-foundation.md`](docs/superpowers/plans/2026-11-04-phase-1-saas-foundation.md)): 13 tasks, each with acceptance criteria and exact pinned versions.
- **Task 1: monorepo skeleton.** This covers the pnpm workspace (`apps/*`), the pinned `packageManager`, Node 24 (`.nvmrc`), a strict shared `tsconfig.base.json`, Prettier, `.editorconfig`, a root `.env.example` and root workspace scripts.
- **Git workflow:** `main` → `develop` → `feature/saas-foundation`, and `.gitignore` hardened against secrets and build artefacts.

### Next (Phase 1)

- [ ] NestJS backend scaffold (`/api/v1` prefix, validation, shutdown hooks)
- [ ] Environment validation with zod
- [ ] Local PostgreSQL through Docker Compose, with separate owner and app roles
- [ ] Prisma schema (`Tenant`, `User`), migrations and RLS policies
- [ ] Tenancy plumbing (context, resolver, guard, tenant-scoped transactions) and cross-tenant isolation tests
- [ ] Health endpoints (`/api/v1/health/live`, `/ready`)
- [ ] Global exception filter
- [ ] Next.js frontend scaffold
- [ ] Backend Dockerfile for Cloud Run
- [ ] Full setup and run docs

### Roadmap

| Phase | Focus                                                                                  |
| ----- | -------------------------------------------------------------------------------------- |
| 1     | SaaS foundation: monorepo, apps, Postgres, Prisma, tenancy and RLS (**in progress**)   |
| 1b    | Authentication (email/password + JWT) and RBAC                                         |
| 2     | Real estate data: projects, units, customers, bookings, schedules, balances            |
| 3     | Collection engine: due detection, collection queue, rules-based risk scoring, promises |
| 4     | AI integration: Gemini, function calling, intent detection, escalation                 |
| 5     | Voice agent: Twilio, Deepgram, Sarvam, call logging and outcomes                       |
| 6     | Payments: gateway abstraction, payment links, verified webhooks, reconciliation        |
| 7     | Analytics and ML risk prediction                                                       |
| 8     | Production readiness: security, compliance, load testing, monitoring                   |

## Repository layout

```text
.
├── CLAUDE.md                 # product and engineering spec
├── docs/superpowers/
│   ├── specs/                # design documents
│   └── plans/                # implementation plans
├── package.json              # root workspace scripts
├── pnpm-workspace.yaml       # apps/* (backend and frontend land here)
├── tsconfig.base.json        # shared strict TypeScript settings
├── .env.example              # local Docker Postgres variables (empty placeholders)
└── .nvmrc / .editorconfig / .prettierrc.json
```

## Getting started

Prerequisites: **Node 24**, **pnpm** (through Corepack) and, from the database step onward, **Docker**.

```bash
git clone https://github.com/Naxt318/real-estate-collections-agent.git
cd real-estate-collections-agent
corepack enable
pnpm install
pnpm format:check
```

Copy `.env.example` to `.env` and fill in the passwords. Never commit `.env`.

The `dev`, `test`, `db:*` and other app scripts are already in `package.json`. They start working as the backend, frontend and Docker Compose setup are added in the next Phase 1 tasks.

## Contributing

- Branch from `develop` using `feature/<name>`. Never push directly to `main`.
- Pin dependencies to exact versions.
- Write tests for business-critical logic, especially tenant isolation and financial workflows.
- Never commit secrets, `.env` files or service-account keys.
