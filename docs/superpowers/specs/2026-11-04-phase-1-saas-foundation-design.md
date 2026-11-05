# Phase 1: SaaS Foundation Plan

## Context

This repo is the start of the AI-Powered Real Estate Collections Platform. `CLAUDE.md` holds the full product and engineering spec. Phase 1 builds the multi-tenant base that every later phase sits on: a monorepo, the Next.js and NestJS apps, PostgreSQL, Prisma, env validation, a health check, and, as decided, the **tenancy plumbing**. That means tenant context, tenant-scoped data access, and PostgreSQL RLS, proven by cross-tenant isolation tests. Authentication and RBAC move to **Phase 1b**. The auth itself will be our own email/password + JWT in NestJS. Phase 1 resolves the tenant through a swappable resolver, so auth slots in later without touching the data layer.

Decisions made with you: scope = foundation + tenancy plumbing; **pnpm workspaces** (no Turborepo); **Docker Compose** Postgres; later auth = **own NestJS auth**.

## 1. Repository assessment

- Git: branch `main`, 3 commits (initial, README, `.gitignore`). `CLAUDE.md` is **untracked** (new spec).
- Files: Python-template `.gitignore` (it already ignores `.env*` except `.env.example`/`.env.template`, plus GCP credential JSON, keys and `secrets/`), a 1-byte `README.md`, `CLAUDE.md`.
- **Implemented:** nothing. No code, package manager, or tooling, so nothing gets rewritten.
- **Missing:** everything in scope.
- Machine: Node **v24.20.0** and npm are present. **pnpm, Docker and psql are absent.**
- Gap: `CLAUDE.md` is spec-only. It has no "commands" section yet; we add one at the end of Phase 1.

## 2. Proposed folder structure

```text
real-estate-collections-agent/
├── package.json                # private root; packageManager pinned; workspace scripts
├── pnpm-workspace.yaml         # apps/*
├── .nvmrc                      # 24
├── .editorconfig  .prettierrc  .prettierignore
├── tsconfig.base.json          # strict shared compiler options
├── .env.example                # compose vars (POSTGRES_PASSWORD, APP_DB_PASSWORD…), empty values
├── docker-compose.yml          # postgres only (apps run on host)
├── docker/postgres/init/01-roles.sh   # creates app_user (NOBYPASSRLS), test DB, default privileges
├── apps/
│   ├── backend/                # NestJS
│   │   ├── src/
│   │   │   ├── main.ts  app.module.ts
│   │   │   ├── config/                 # zod env schema + typed AppConfigService
│   │   │   ├── common/
│   │   │   │   ├── filters/            # global exception filter
│   │   │   │   └── tenancy/            # TenantContext (AsyncLocalStorage), TenantResolver port,
│   │   │   │                           # DevHeaderTenantResolver, TenantGuard, @SkipTenant()
│   │   │   ├── infrastructure/database/  # PrismaService, TenantTransactionRunner, prisma health indicator
│   │   │   ├── health/                 # /api/v1/health/live, /ready
│   │   │   └── users/                  # repository only (UsersRepository): first tenant-owned model, no API
│   │   ├── prisma/schema.prisma  prisma/migrations/  prisma.config.ts
│   │   ├── test/                       # e2e + integration (real Postgres test DB)
│   │   ├── Dockerfile  .dockerignore  .env.example
│   └── frontend/               # Next.js App Router, TS, Tailwind
│       ├── src/app/  src/env.ts        # zod-validated env
│       └── .env.example
└── docs/superpowers/specs/2026-11-04-phase-1-saas-foundation-design.md
```

I named the apps `apps/backend` / `apps/frontend` to match CLAUDE.md §14's vocabulary. No `packages/` shared lib yet: nothing is shared besides tsconfig/prettier, and those live at the root. Following §14, I'm **not** creating empty domain modules.

## 3. Architecture decisions

1. **Modular monolith, pnpm workspaces.** Two apps and no build orchestrator. Turborepo can come later if CI times justify it.
2. **Versions pinned exactly** when installed: current Next.js, React, Tailwind v4, NestJS 11, TypeScript 5.x, Prisma (latest stable, exact pin as required by §7.8), Postgres **17** image (Cloud SQL supported).
3. **Two DB roles.** These are the core of RLS working at all:
   - `app_owner` (in local dev, the compose superuser) owns tables and runs migrations → `MIGRATION_DATABASE_URL`, used only by `prisma.config.ts`.
   - `app_user` is non-owner and `NOBYPASSRLS`, with DML-only grants via `ALTER DEFAULT PRIVILEGES` → `DATABASE_URL`, used by the running app.
   - RLS uses `ENABLE` + `FORCE ROW LEVEL SECURITY`. The policy is `tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid` with both `USING` and `WITH CHECK`. The `NULLIF` matters: once a transaction-local setting is released, a pooled session reads `''`, not NULL.
   - RLS SQL is added through `prisma migrate dev --create-only` plus a hand-edited migration, so Prisma stays the single migration authority (§7).
4. **Tenant context = `AsyncLocalStorage`** (`TenantContext`, hand-rolled, ~30 lines, no dependency). It works the same for HTTP requests and future background jobs (§4 rule 5). I chose it over request-scoped providers, which spread the request scope to every class that depends on them.
5. **Tenant resolution behind a port (DI token `TENANT_RESOLVER`).** Phase 1: `DevHeaderTenantResolver` reads `X-Tenant-Id`. It is enabled only when `ALLOW_DEV_TENANT_HEADER=true`, and env validation **rejects that in production**. Phase 1b adds `JwtTenantResolver`, a one-line provider swap. This is an Adapter/Strategy use that solves a real problem.
6. **Global `TenantGuard`.** It validates the UUID, confirms the tenant exists, and stores it in context. `@SkipTenant()` exempts health. Requests fail closed: no context means no data.
7. **Tenant-scoped data access: `TenantTransactionRunner.run(fn)`.** It opens a Prisma interactive transaction, executes `SELECT set_config('app.tenant_id', $1, true)` (transaction-local, so nothing leaks through the pool), then passes the tx client to `fn`. Repositories (e.g. `UsersRepository`) only receive this tx client. They never touch the root `PrismaService`, so tenant scope can't be skipped by accident. Repositories also filter by `tenantId` explicitly, as defence in depth on top of RLS.
8. **Phase 1 models:** `Tenant` (id uuid, name, status enum, timestamps) and a minimal `User` (id, tenantId FK, email, name, timestamps, `@@unique([tenantId, email])`, `@@index([tenantId])`). Auth fields wait for 1b. User is the natural first tenant-owned table and gives the isolation tests something real to test. RLS goes on both tables (`tenants` keyed by `id`).
9. **Env validation with zod**, wired through `ConfigModule.forRoot({ validate })`. Startup fails with one clear message listing every invalid var. The frontend has its own `src/env.ts` zod schema.
10. **API conventions:** global prefix `api`, URI versioning `v1`, `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, `enableShutdownHooks`, and a minimal global exception filter that returns a consistent error shape.
11. **Health:** `@nestjs/terminus`. `/api/v1/health/live` checks the process only. `/api/v1/health/ready` runs `SELECT 1` as `app_user` and returns 503 when the DB is down. This is the Cloud Run probe target.
12. **Docker:** compose runs **Postgres only**. The apps run on the host for fast reloads. The backend gets a multi-stage, non-root, `PORT`-aware Dockerfile ready for Cloud Run (built via `pnpm deploy`). The frontend container is deferred until its hosting choice is made.
13. **No FastAPI, no providers, no queues, no logging library** in Phase 1. Structured logging (e.g. pino for Cloud Logging) comes with the deployment work.

## 4. Implementation sequence (each step = one small commit on `feature/saas-foundation`)

Step 0 is git setup: commit `CLAUDE.md` on `main`, create `develop` from `main`, then `feature/saas-foundation` from `develop` (§19). After that, write the design doc to `docs/superpowers/specs/` and the task plan via `superpowers:writing-plans`.

| # | Task | Acceptance criteria |
|---|------|---------------------|
| 1 | **Monorepo skeleton:** root `package.json` (`packageManager: pnpm@<pinned>`, `engines.node >=24`), `pnpm-workspace.yaml`, `.nvmrc`, `.editorconfig`, Prettier, `tsconfig.base.json`, root `.env.example`, `.gitignore` additions (`node_modules`, `.next`, `dist`, `coverage`, `*.tsbuildinfo`) | `pnpm install` succeeds from clean; `pnpm format:check` passes; `git status` shows no build artefacts |
| 2 | **NestJS scaffold** in `apps/backend` (Nest CLI, `--skip-git`, pnpm), trimmed to the essentials; prefix, versioning, ValidationPipe, shutdown hooks | `pnpm --filter backend build`, `lint`, `typecheck`, `test` all pass; app boots |
| 3 | **Env validation (TDD).** zod schema + `AppConfigService` | Unit tests: missing `DATABASE_URL` → fails naming the var; `NODE_ENV=production` + `ALLOW_DEV_TENANT_HEADER=true` → fails; defaults applied (`PORT=3001`); app exits non-zero with a readable message on bad env |
| 4 | **Postgres via compose.** `docker-compose.yml` (pg17, healthcheck, named volume), init script creating `app_user` (LOGIN, NOBYPASSRLS), `collections_test` DB, default privileges; root scripts `db:up` / `db:down` / `db:reset` | `pnpm db:up` → container healthy; `app_user` can connect to both DBs; `SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user'` = false; no passwords in committed files |
| 5 | **Prisma.** Exact-pinned `prisma` + client + pg adapter; `prisma.config.ts` (migration URL); `Tenant` + `User` models; migration `init`; migration `enable_rls` (create-only, hand-edited SQL); `PrismaService` in `infrastructure/database`; scripts `db:migrate`, `db:migrate:deploy`, `db:generate`, `db:seed` (two demo tenants, clearly labelled) | `prisma migrate reset` applies cleanly from zero; `migrate status` is clean; `prisma validate` passes; `pg_class.relforcerowsecurity` is true for both tables; generated client is not committed |
| 6 | **Tenancy plumbing (TDD, integration against the test DB).** `TenantContext`, `TENANT_RESOLVER` + `DevHeaderTenantResolver`, global `TenantGuard`, `@SkipTenant()`, `TenantTransactionRunner`, `UsersRepository` | Tests prove: (a) tenant A context sees only A's users; (b) `app_user` with no context sees 0 rows; (c) inserting a row with tenant B's id inside A's context is rejected by `WITH CHECK`; (d) **no pool leakage**: with a pool of size 1, run an A transaction, then a no-context query → 0 rows; (e) concurrent interleaved A/B runs never cross; (f) guard rejects missing/malformed/unknown tenant ids (400/401/404 as specified in the test) and the dev resolver is not registered when disabled |
| 7 | **Health endpoints** (terminus + Prisma indicator, `@SkipTenant`) | e2e (supertest): `/api/v1/health/live` 200; `/ready` 200 with DB up; indicator unit test → 503 when the query throws; no tenant header required |
| 8 | **Global exception filter** with a consistent error body | e2e: unknown route 404 and validation error 400 both return the agreed shape; no stack traces in production mode |
| 9 | **Next.js scaffold** in `apps/frontend` (App Router, TS, Tailwind, ESLint, `src/`); zod `src/env.ts` (`NEXT_PUBLIC_API_BASE_URL`); one page showing the app name and backend readiness (server-side fetch; shows "unavailable" gracefully) | `pnpm --filter frontend build`, `lint`, `typecheck` pass; page renders with the API up and down; build fails on invalid env |
| 10 | **Root quality scripts:** `pnpm dev` (both apps in parallel), `lint`, `typecheck`, `test`, `test:integration`, `format`, `format:check`; shared Prettier; strict TS in both apps | Every root script passes from a clean clone |
| 11 | **Backend Dockerfile** + `.dockerignore` | `docker build -f apps/backend/Dockerfile .` succeeds; container runs as non-root, honours `PORT`, `/health/live` returns 200; image contains no `.env` |
| 12 | **Docs:** README (prereqs, setup, run, test, migrate, troubleshooting); add a "Commands" + "Tenancy architecture" section to `CLAUDE.md`; per-app `.env.example` | A fresh clone following only the README reaches green tests and a running stack |
| 13 | **Final verification** (`superpowers:verification-before-completion`) + code review | All checks in §6 green; results reported honestly, including anything incomplete |

## 5. Dependencies and setup requirements

**You install (one time):**
- Docker Desktop or OrbStack (needed from task 4 onward; tasks 1–3 can proceed without it).
- `corepack enable` to activate the pinned pnpm (no global install).

**Runtime deps (backend):** `@nestjs/*` 11, `@nestjs/config`, `@nestjs/terminus`, `class-validator`, `class-transformer`, `zod`, `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`.
**Dev deps:** jest, ts-jest, supertest, typescript-eslint, prettier.
**Frontend:** next, react, react-dom, tailwindcss v4, zod, eslint-config-next.
No GCP resources are created in Phase 1.

## 6. Testing strategy

- **Unit (Jest, backend):** env schema, guard/resolver behaviour, exception filter, health indicator. No DB.
- **Integration (Jest, `--runInBand`, real Postgres `collections_test` as `app_user`):** RLS and repository isolation, tests (a)–(f) above. The test DB is migrated with `migrate deploy` in global setup and truncated between tests. These are the tests CLAUDE.md §4.9 / §18 calls mandatory.
- **E2E (supertest on the Nest app):** health and error shape.
- **Frontend:** lint + typecheck + `next build` only. A component test runner gets added with the first real UI (login, Phase 1b), not before.
- **TDD** for tasks 3, 6, 7, 8 (write the failing test first). Scaffolding tasks are verified by build/lint commands.
- Gate before claiming done: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm --filter frontend build`.

## 7. Risks and unresolved decisions

1. **Prisma major-version churn.** Recent Prisma moved to `prisma.config.ts`, driver adapters, and an ESM-first generated client. NestJS defaults to CommonJS. Mitigation: confirm at install time; use the generator's CJS output, or pin the last version that works cleanly with Nest. Either way the result is a pinned exact version, and I'll report which.
2. **Interactive transaction per tenant operation** holds a pooled connection for the whole operation. That's fine for CRUD. Long-running work (calls, CRM sync) must open short tenant transactions, not one long one. Pool sizing needs attention for Cloud SQL later.
3. **Phase 1b login lookup**: before login the tenant is unknown, and RLS hides users. This needs a narrow, deliberate path (e.g. a `SECURITY DEFINER` lookup function or a global identity table). **Unresolved: can one user belong to multiple builders?** That determines the user/identity model.
4. **Tenant creation (onboarding)** needs a privileged platform path that inserts into `tenants`. Designed in 1b. Phase 1 seeds tenants through the owner connection.
5. **Cloud SQL role bootstrap:** `app_user` and its grants come from the compose init script locally. On GCP the same SQL must run as infra bootstrap, outside Prisma migrations. Documented, not automated, in Phase 1.
6. **Docker not yet installed** blocks tasks 4–8 and 11 until you install it.
7. **Branch strategy:** I'll create `develop` from `main` per §19 unless you'd rather work straight off `main` for now.
8. **Frontend hosting** (Cloud Run vs other) is undecided, which is why the frontend Dockerfile is deferred.
