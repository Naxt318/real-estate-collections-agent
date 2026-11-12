# Phase 1 SaaS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pnpm monorepo with a NestJS backend and a Next.js frontend, local Postgres, Prisma migrations, validated env, health checks, and tenant isolation enforced by PostgreSQL RLS and proven by tests.

**Architecture:** A modular monolith. The backend resolves the tenant per request through a swappable `TenantResolver`. It holds the tenant in `AsyncLocalStorage` and runs every tenant-scoped DB operation in a Prisma interactive transaction that first sets `app.tenant_id` transaction-locally. RLS policies on a non-owner, `NOBYPASSRLS` role do the enforcement. Prisma owns all schema and migrations, including the RLS SQL.

**Tech Stack:** Node 24, pnpm 12.16.1, NestJS 12.3.3, Prisma 7.10.1 (+ `@prisma/adapter-pg`), PostgreSQL 17, zod 4.6.7, Jest 30.5.2 + ts-jest 29.4.15, TypeScript 5.9.3, Next.js 16.4.5, React 19.3.1, Tailwind 4.3.4.

**Spec:** `docs/superpowers/specs/2026-11-04-phase-1-saas-foundation-design.md` (and `CLAUDE.md`)

## Global Constraints

- Pin every dependency to an **exact** version (no `^`/`~`); versions as in Tech Stack. Don't use TypeScript 7 (ts-jest peer is `<7`) or the Prisma 8 RC.
- Branch: `feature/saas-foundation`. One commit per task minimum; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No secrets in git. Commit only `.env.example` files, with empty or placeholder values. Real values live in `.env` (already git-ignored).
- Out of scope: auth, RBAC, FastAPI, Gemini/Twilio/Deepgram/Sarvam, payments, queues, empty domain modules.
- Backend API: global prefix `api`, URI versioning default `1` → routes are `/api/v1/...`.
- Money is never involved in Phase 1. If anything numeric is added, it must not be a float for money (CLAUDE.md §7).
- TS `strict: true` in both apps.

## Review Focus

1. **Boolean env strings:** `ALLOW_DEV_TENANT_HEADER="false"` must be false; `"1"`/`"TRUE"`/`"yes"` must fail validation (`z.coerce.boolean` would turn `"false"` into true). Test in Task 3.
2. **A failed tenant transaction must not leak context:** when `fn` throws inside `runAs(A)`, the next no-context query on the same pooled connection sees 0 rows. Test in Task 6.
3. **DB down at startup:** the app still boots, `/health/live` = 200, `/health/ready` = 503 (Prisma connects lazily, never in `onModuleInit`). Test in Task 8.
4. **Suspended tenant and uppercase UUID in header:** SUSPENDED → 403; an uppercase form of a valid id resolves to the same tenant. Test in Task 7.
5. **Email case collisions:** creating `A@x.com` then `a@x.com` in the same tenant fails with a unique violation; the same email in another tenant succeeds. Test in Task 6.

---

### Task 1: Monorepo skeleton

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.editorconfig`, `.prettierrc.json`, `.prettierignore`, `tsconfig.base.json`, `.env.example`
- Modify: `.gitignore` (append Node section)

**Interfaces:**
- Produces: root scripts that later tasks fill in: `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, `format`, `format:check`, `db:up`, `db:down`, `db:reset`, `db:migrate`, `db:migrate:deploy`, `db:seed`. Root scripts delegate: `dev` → `pnpm -r --parallel run dev`; `lint|typecheck|test|build` → `pnpm -r run <name>`; `test:integration` and `db:migrate*`/`db:seed` → `pnpm --filter backend run <name>`; `db:up` → `docker compose up -d --wait postgres`; `db:down` → `docker compose down`; `db:reset` → `docker compose down -v && pnpm db:up`.

- [ ] **Step 1:** `corepack enable` (ask the user to run it if it needs sudo). Root `package.json`: `"private": true`, `"packageManager": "pnpm@12.16.1"`, `"engines": {"node": ">=24"}`, the scripts above, devDependency `prettier` (exact latest 3.x). `pnpm-workspace.yaml`: `packages: ["apps/*"]`. `.nvmrc`: `24`.
- [ ] **Step 2:** `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`. Prettier: `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`. `.prettierignore`: `pnpm-lock.yaml`, `**/dist`, `**/.next`, `**/generated`, `**/coverage`, `CLAUDE.md`, `**/migrations/**/*.sql`.
- [ ] **Step 3:** Append to `.gitignore`: `node_modules/`, `.next/`, `dist/`, `coverage/`, `*.tsbuildinfo`, `next-env.d.ts`, `apps/backend/src/generated/`, `.DS_Store`.
- [ ] **Step 4:** Root `.env.example` (compose only): `POSTGRES_USER=app_owner`, `POSTGRES_PASSWORD=`, `POSTGRES_DB=collections_dev`, `POSTGRES_PORT=5432`, `APP_DB_PASSWORD=`.
- [ ] **Step 5:** Verify: `pnpm install` exits 0; `pnpm format:check` exits 0; `git status` shows no `node_modules`.
- [ ] **Step 6:** Commit `chore: initialise pnpm monorepo skeleton`.

### Task 2: NestJS scaffold

**Files:**
- Create: `apps/backend/**` via `pnpm dlx @nestjs/cli@12.0.11 new backend --directory apps/backend --package-manager pnpm --skip-git --strict`
- Modify: `apps/backend/src/main.ts`, `apps/backend/package.json`, `apps/backend/tsconfig.json`
- Delete: scaffold `app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`, `test/app.e2e-spec.ts`, any app-level `.prettierrc`

**Interfaces:**
- Produces: `export async function createApp(): Promise<INestApplication>` in `apps/backend/src/bootstrap.ts`. It applies `setGlobalPrefix('api')`, `enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`, `useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`, `enableShutdownHooks()`. `main.ts` calls it and listens on the config port. E2E tests reuse `createApp`'s config by calling an exported `configureApp(app: INestApplication): void`.
- Backend scripts: `dev` (`nest start --watch`), `build`, `start` (`node dist/main.js`), `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`jest`, unit only: `src/**/*.spec.ts`).

- [ ] **Step 1:** Scaffold, delete the sample files, pin all deps to exact versions (NestJS 12.3.3 family, typescript 5.9.3, jest 30.5.2, ts-jest 29.4.15), and make `tsconfig.json` extend `../../tsconfig.base.json`.
- [ ] **Step 2:** Implement `bootstrap.ts` / `main.ts` as above. Temporarily hard-code port 3001 (Task 3 replaces it).
- [ ] **Step 3:** Verify: `pnpm --filter backend build`, `lint`, `typecheck` exit 0; `pnpm --filter backend test --passWithNoTests` exits 0; `pnpm --filter backend dev` boots and logs "Nest application successfully started".
- [ ] **Step 4:** Commit `feat(backend): scaffold NestJS app with API prefix, versioning and validation`.

### Task 3: Environment validation

**Files:**
- Create: `apps/backend/src/config/env.schema.ts`, `apps/backend/src/config/app-config.service.ts`, `apps/backend/src/config/config.module.ts`, `apps/backend/.env.example`
- Test: `apps/backend/src/config/env.schema.spec.ts`

**Interfaces:**
- Produces:
  - `envSchema` (zod). Fields: `NODE_ENV: 'development'|'test'|'production'` (default `development`); `PORT: number` (coerced, default `3001`); `DATABASE_URL: string` (URL starting `postgresql://`, required); `ALLOW_DEV_TENANT_HEADER: boolean` (accepts only the strings `"true"`/`"false"`, default false). Refinement: production + `ALLOW_DEV_TENANT_HEADER` true → issue on `ALLOW_DEV_TENANT_HEADER` with message `must not be enabled in production`.
  - `type Env = z.infer<typeof envSchema>`
  - `validateEnv(raw: Record<string, unknown>): Env`. On failure throws `Error` whose message starts with `Invalid environment configuration:` and has one line `- <VAR>: <message>` per issue.
  - `AppConfigService.get<K extends keyof Env>(key: K): Env[K]` (wraps `ConfigService<Env, true>`).
  - `AppConfigModule` (global) = `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })` + `AppConfigService`.
- `apps/backend/.env.example` keys: `NODE_ENV=development`, `PORT=3001`, `DATABASE_URL=`, `MIGRATION_DATABASE_URL=`, `TEST_DATABASE_URL=`, `TEST_MIGRATION_DATABASE_URL=`, `ALLOW_DEV_TENANT_HEADER=true`. (The `MIGRATION_*`/`TEST_*` keys are read by Prisma config and the test setup, not by `envSchema`.)

- [ ] **Step 1: Write failing tests** in `env.schema.spec.ts`:
  - `validateEnv({})` throws matching `/Invalid environment configuration:[\s\S]*- DATABASE_URL:/`.
  - `validateEnv({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' })` → `{ NODE_ENV: 'development', PORT: 3001, ALLOW_DEV_TENANT_HEADER: false, ... }`.
  - `PORT: '4000'` → `4000`; `PORT: 'abc'` throws naming `PORT`.
  - `ALLOW_DEV_TENANT_HEADER: 'false'` → `false`; `'true'` → `true`; each of `'1'`, `'TRUE'`, `'yes'` throws naming `ALLOW_DEV_TENANT_HEADER`.
  - `{ NODE_ENV: 'production', ALLOW_DEV_TENANT_HEADER: 'true', DATABASE_URL: … }` throws `/ALLOW_DEV_TENANT_HEADER: must not be enabled in production/`.
  - `DATABASE_URL: 'mysql://x'` throws naming `DATABASE_URL`.
- [ ] **Step 2:** Run `pnpm --filter backend test -- env.schema` → FAIL (module not found).
- [ ] **Step 3:** Implement the schema, `validateEnv`, `AppConfigService`, `AppConfigModule`. Import `AppConfigModule` in `AppModule`; `main.ts` reads `PORT` from `AppConfigService`.
- [ ] **Step 4:** Run tests → PASS. Run `DATABASE_URL= pnpm --filter backend start` after a build → exits non-zero printing the `Invalid environment configuration:` block.
- [ ] **Step 5:** Commit `feat(backend): validate environment with zod at startup`.

### Task 4: Local PostgreSQL via Docker Compose

Prerequisite: Docker Desktop or OrbStack installed by the user. If `docker` is missing, stop and ask.

**Files:**
- Create: `docker-compose.yml`, `docker/postgres/init/01-roles.sh` (executable)

**Interfaces:**
- Produces: DBs `collections_dev` and `collections_test` on `localhost:${POSTGRES_PORT}`. Roles: `app_owner` (the compose `POSTGRES_USER`, superuser, runs migrations) and `app_user` (LOGIN, NOSUPERUSER, NOBYPASSRLS, password `APP_DB_PASSWORD`).

- [ ] **Step 1:** `docker-compose.yml`: service `postgres`, image `postgres:17`, `env_file: .env`, port `${POSTGRES_PORT:-5432}:5432`, named volume `pgdata`, mounts `./docker/postgres/init:/docker-entrypoint-initdb.d:ro`, healthcheck `pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}`. Pass `APP_DB_PASSWORD` through to the container environment.
- [ ] **Step 2:** `01-roles.sh` (bash, `set -euo pipefail`, uses `psql -v ON_ERROR_STOP=1`):
  - `CREATE ROLE app_user LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD :'pw'` (password via psql variable from `APP_DB_PASSWORD`; never echoed);
  - `CREATE DATABASE collections_test OWNER app_owner`;
  - for **each** of `collections_dev` and `collections_test`: `GRANT CONNECT ON DATABASE`, `GRANT USAGE ON SCHEMA public TO app_user`, `ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user`, same for `USAGE, SELECT ON SEQUENCES`.
- [ ] **Step 3:** Copy `.env.example` → `.env` with generated passwords (`openssl rand -hex 16`), and copy `apps/backend/.env.example` → `apps/backend/.env` with matching URLs (`DATABASE_URL`/`TEST_DATABASE_URL` as `app_user`, `MIGRATION_*` as `app_owner`). Neither file gets committed.
- [ ] **Step 4:** Verify: `pnpm db:up` returns once healthy. `docker compose exec postgres psql -U app_owner -d collections_dev -tAc "select rolbypassrls, rolsuper from pg_roles where rolname='app_user'"` → `f|f`. `psql "$TEST_DATABASE_URL" -c 'select 1'` via `docker compose exec` succeeds. `git status` shows no `.env`.
- [ ] **Step 5:** Commit `feat(infra): add local Postgres with owner/app roles via docker compose`.

### Task 5: Prisma schema, RLS migration, PrismaService

**Files:**
- Create: `apps/backend/prisma.config.ts`, `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/*_init/`, `apps/backend/prisma/migrations/*_enable_rls/migration.sql`, `apps/backend/prisma/seed.ts`, `apps/backend/src/infrastructure/database/prisma.service.ts`, `apps/backend/src/infrastructure/database/database.module.ts`

**Interfaces:**
- Produces:
  - Generated client at `apps/backend/src/generated/prisma` (generator `prisma-client`, `moduleFormat = "cjs"`, git-ignored, regenerated by a backend `postinstall`/`prebuild` script `prisma generate`).
  - `enum TenantStatus { ACTIVE SUSPENDED }`
  - `model Tenant`: `id String @id @default(uuid()) @db.Uuid`, `name String`, `status TenantStatus @default(ACTIVE)`, `createdAt @map("created_at")`, `updatedAt @updatedAt @map("updated_at")`, `users User[]`, `@@map("tenants")`.
  - `model User`: `id` uuid as above, `tenantId String @map("tenant_id") @db.Uuid`, `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)`, `email String`, `name String?`, timestamps, `@@unique([tenantId, email])`, `@@index([tenantId])`, `@@map("users")`.
  - `PrismaService extends PrismaClient implements OnModuleDestroy`. Constructor: `new PrismaPg({ connectionString: config.get('DATABASE_URL') })`. **No `$connect` in `onModuleInit`** (lazy; see Review Focus 3). `$disconnect` on destroy.
  - `DatabaseModule` (global) exports `PrismaService` (and `TenantTransactionRunner` from Task 6).
  - Backend scripts: `prisma:generate`, `db:migrate` (`prisma migrate dev`), `db:migrate:deploy`, `db:seed` (`prisma db seed`, seed runs via `tsx`).
- `prisma.config.ts`: `defineConfig({ schema: 'prisma/schema.prisma', migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' }, datasource: { url: env('MIGRATION_DATABASE_URL') } })`. Load `.env` with `process.loadEnvFile()` when present.

- [ ] **Step 1:** Install exact `prisma@7.10.1`, `@prisma/client@7.10.1`, `@prisma/adapter-pg@7.10.1`, `pg` (exact latest 8.x), `tsx`. Write the config and schema. `pnpm --filter backend exec prisma validate` → valid.
- [ ] **Step 2:** `pnpm db:migrate --name init` → creates and applies `*_init`.
- [ ] **Step 3:** `pnpm --filter backend exec prisma migrate dev --create-only --name enable_rls`, then put exactly this SQL in it:

```sql
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenants"
  USING ("id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

  Apply it with `pnpm db:migrate`.
- [ ] **Step 4:** `seed.ts` (runs as owner, so RLS is bypassed): upserts two tenants named `DEMO — Builder A` and `DEMO — Builder B` with fixed UUIDs `00000000-0000-4000-8000-00000000000a` / `…0b`, plus two users each (`demo-a1@example.test`, …). Print the tenant ids.
- [ ] **Step 5:** Implement `PrismaService` and `DatabaseModule`, and import it in `AppModule`.
- [ ] **Step 6:** Verify: `pnpm --filter backend exec prisma migrate reset --force` succeeds from zero and reseeds. `prisma migrate status` → "Database schema is up to date". `select relname, relrowsecurity, relforcerowsecurity from pg_class where relname in ('tenants','users')` → all `t`. `pnpm --filter backend build` and `typecheck` pass. `git status` shows no generated client.
- [ ] **Step 7:** Commit `feat(db): add Prisma schema for tenants and users with RLS policies`.

### Task 6: Tenant-scoped data access + RLS isolation tests

**Files:**
- Create: `apps/backend/src/common/tenancy/tenant-context.ts`, `apps/backend/src/common/tenancy/tenancy.errors.ts`, `apps/backend/src/infrastructure/database/tenant-transaction-runner.ts`, `apps/backend/src/users/users.repository.ts`, `apps/backend/src/users/users.module.ts`, `apps/backend/test/jest-integration.config.ts`, `apps/backend/test/support/global-setup.ts`, `apps/backend/test/support/db.ts`
- Test: `apps/backend/test/tenancy/rls-isolation.int-spec.ts`, `apps/backend/src/common/tenancy/tenant-context.spec.ts`

**Interfaces:**
- Produces:
  - `class TenantContext` (`@Injectable`, singleton, wraps `AsyncLocalStorage<{ tenantId: string }>`): `run<T>(tenantId: string, fn: () => T): T`; `getTenantId(): string | undefined`; `requireTenantId(): string` (throws `TenantContextMissingError`).
  - `type TenantTx = Prisma.TransactionClient`
  - `class TenantTransactionRunner`: `run<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T>` uses `requireTenantId()`, opens `prisma.$transaction(async tx => …)`, first executes ``tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)` ``, then `fn(tx)`. Also `runAs<T>(tenantId: string, fn): Promise<T>` = `tenantContext.run(tenantId, () => this.run(fn))`, for jobs, the guard and tests. Rejects a non-UUID `tenantId` with `InvalidTenantIdError` before touching the DB.
  - Constructors (tests build these by hand around `appClient()`): `new TenantTransactionRunner(prisma: PrismaClient, tenantContext: TenantContext)`, `new UsersRepository(tenantContext: TenantContext)`. In Nest, `PrismaService` is injected as the `PrismaClient`.
  - `class UsersRepository`: `list(tx: TenantTx, page?: { take?: number; skip?: number }): Promise<User[]>` (take default 50, clamped to 1–100, ordered `createdAt asc`, `where: { tenantId }`); `create(tx: TenantTx, input: { email: string; name?: string }): Promise<User>` (tenantId from context, email trimmed and lowercased). `tenantId` always comes from `TenantContext`, never from a parameter.
  - `test/support/db.ts`: `ownerClient(): PrismaClient` (TEST_MIGRATION_DATABASE_URL); `appClient(opts?: { poolMax?: number }): PrismaClient` (TEST_DATABASE_URL, `PrismaPg({ connectionString, max })`); `resetDb(owner)` (`TRUNCATE users, tenants CASCADE`); `seedTwoTenants(owner): Promise<{ a: string; b: string; suspended: string }>` (one user per active tenant, plus a SUSPENDED tenant).
  - Integration Jest config: matches `test/**/*.int-spec.ts` and `test/**/*.e2e-spec.ts`, `globalSetup` loads `apps/backend/.env`, sets `DATABASE_URL=TEST_DATABASE_URL` and runs `prisma migrate deploy` against `TEST_MIGRATION_DATABASE_URL`. Script `test:integration` = `jest -c test/jest-integration.config.ts --runInBand`.

- [ ] **Step 1: Unit tests** `tenant-context.spec.ts`: `getTenantId()` undefined outside `run`; correct inside, including after `await`; nested `run` restores the outer id on return; `requireTenantId()` outside throws `TenantContextMissingError`; two concurrent `run`s with `setTimeout` interleaving each see their own id.
- [ ] **Step 2: Integration tests** `rls-isolation.int-spec.ts`. `beforeEach`: `resetDb` + `seedTwoTenants`. Cases:
  - (a) `runAs(a, tx => repo.list(tx))` returns only A's user; same for B.
  - (b) no context: `app.user.findMany()` → `[]` and `app.tenant.findMany()` → `[]`.
  - (c) inside `runAs(a)`, `tx.user.create({ data: { tenantId: b, email: 'x@y.test' } })` rejects matching `/row-level security/`.
  - (d) with `appClient({ poolMax: 1 })`: `runAs(a, list)` then `client.user.findMany()` → `[]`.
  - (d2) with `poolMax: 1`: `runAs(a, async tx => { await repo.list(tx); throw new Error('boom') })` rejects `boom`; the following `client.user.findMany()` → `[]` (Review Focus 2).
  - (e) `Promise.all` over 20 interleaved `runAs(a|b, list)` calls (pool max 5) → each result contains only its own tenant's rows.
  - (f) `runAs('not-a-uuid', …)` rejects `InvalidTenantIdError`; `app.$queryRaw` of `select rolbypassrls from pg_roles where rolname = current_user` → `false`.
  - (g) email: `create({ email: ' A@X.test ' })` stores `a@x.test`; creating `a@x.test` again in A rejects (Prisma `P2002`); creating it in B succeeds (Review Focus 5).
  - (h) `repo.list(tx, { take: 1000 })` issues `take: 100` (assert with 101 seeded users → length 100).
- [ ] **Step 3:** Run `pnpm test:integration` and `pnpm --filter backend test` → FAIL (missing modules).
- [ ] **Step 4:** Implement `TenantContext`, errors, `TenantTransactionRunner` (register and export in `DatabaseModule`; `TenantContext` lives in a global `TenancyModule`), `UsersRepository` + `UsersModule`.
- [ ] **Step 5:** Run both suites → PASS.
- [ ] **Step 6:** Commit `feat(tenancy): tenant-scoped transactions with RLS and isolation tests`.

### Task 7: Tenant resolution, guard and context interceptor

**Files:**
- Create: `apps/backend/src/common/tenancy/tenant-resolver.ts`, `dev-header-tenant.resolver.ts`, `null-tenant.resolver.ts`, `skip-tenant.decorator.ts`, `tenant.guard.ts`, `tenant-context.interceptor.ts`, `tenancy.module.ts` (extend Task 6's), `apps/backend/src/tenants/tenants.repository.ts`
- Test: `apps/backend/src/common/tenancy/tenant.guard.spec.ts`, `apps/backend/test/tenancy/tenant-guard.e2e-spec.ts`

**Interfaces:**
- Consumes: `TenantContext`, `TenantTransactionRunner.runAs`, `AppConfigService`.
- Produces:
  - `interface TenantResolver { resolve(req: Request): string | null }`; token `export const TENANT_RESOLVER = Symbol('TENANT_RESOLVER')`.
  - `DevHeaderTenantResolver` returns the trimmed `x-tenant-id` header, or null. `NullTenantResolver` always returns null. `TenancyModule` binds `TENANT_RESOLVER` via `useFactory`: Dev resolver iff `ALLOW_DEV_TENANT_HEADER`, else Null. (Phase 1b adds `JwtTenantResolver` here.)
  - `@SkipTenant()` sets metadata key `SKIP_TENANT_KEY = 'skipTenant'`.
  - `TenantsRepository.findById(tx: TenantTx): Promise<Tenant | null>` (the tenant row visible under the current context).
  - `TenantGuard` (global `APP_GUARD`): skips when `SKIP_TENANT_KEY` is set. Otherwise: null → `401 Unauthorized` ("Tenant context required"); not a UUID → `400`; `runAs(id, tx => tenants.findById(tx))` null or status `SUSPENDED` → `403`. On success sets `req.tenantId` to the **canonical lowercase** id.
  - `TenantContextInterceptor` (global `APP_INTERCEPTOR`): when `req.tenantId` is set, runs `next.handle()` inside `tenantContext.run(req.tenantId, …)` (wrap the subscription in a new `Observable`).

- [ ] **Step 1: Unit tests** `tenant.guard.spec.ts` (mock resolver, runner and reflector): skip metadata → true without calling the resolver; null → `UnauthorizedException`; `'abc'` → `BadRequestException`; unknown → `ForbiddenException`; suspended → `ForbiddenException`; uppercase valid id → true and `req.tenantId` lowercase (Review Focus 4).
- [ ] **Step 2: E2E** `tenant-guard.e2e-spec.ts`: build the app with a **test-only** controller registered in the testing module (`GET /api/v1/__test/whoami` returns `{ tenantId: TenantContext.requireTenantId(), users: (await runner.run(tx => usersRepo.list(tx))).map(u => u.email) }`). Cases: no header → 401; `x-tenant-id: a` → 200 with only A's emails; B likewise; suspended → 403; with `ALLOW_DEV_TENANT_HEADER=false` (separate app instance) a valid header → 401.
- [ ] **Step 3:** Run → FAIL. **Step 4:** Implement. **Step 5:** Run unit + integration → PASS.
- [ ] **Step 6:** Commit `feat(tenancy): resolve tenant per request with fail-closed guard`.

### Task 8: Global exception filter + health endpoints

**Files:**
- Create: `apps/backend/src/common/filters/all-exceptions.filter.ts`, `apps/backend/src/health/health.controller.ts`, `apps/backend/src/health/health.module.ts`
- Modify: `apps/backend/src/bootstrap.ts` (`configureApp` registers the filter)
- Test: `apps/backend/src/common/filters/all-exceptions.filter.spec.ts`, `apps/backend/test/health/health.e2e-spec.ts`

**Interfaces:**
- Produces:
  - Error body (every error response): `{ statusCode: number, error: string, message: string | string[], path: string, timestamp: string }`. `HttpException` → its status; `message` comes from the response's `message` field when present, else `exception.message`; other fields (e.g. terminus details) are dropped. Any non-`HttpException` → 500, `error: 'Internal Server Error'`, `message: 'Internal server error'`, logged with stack via Nest `Logger`. Stacks never appear in the body.
  - `GET /api/v1/health/live` → `200` (terminus `health.check([])`). `GET /api/v1/health/ready` → terminus `PrismaHealthIndicator.pingCheck('database', prisma)`: 200 when up, 503 when down. Controller decorated `@SkipTenant()`.

- [ ] **Step 1: Unit tests** for the filter (mock `ArgumentsHost`): `BadRequestException(['email must be an email'])` → 400 and that array as `message`; `NotFoundException()` → 404 shape; `new Error('db password=secret')` → 500, body message `'Internal server error'`, and the body JSON does not contain `secret`.
- [ ] **Step 2: E2E tests** `health.e2e-spec.ts`: `/api/v1/health/live` 200 with no tenant header; `/api/v1/health/ready` 200; `GET /api/v1/nope` → 404 matching the error-body keys exactly. A second app instance with `DATABASE_URL=postgresql://app_user:x@127.0.0.1:1/none`: boots without throwing, `/live` 200, `/ready` 503 (Review Focus 3).
- [ ] **Step 3:** Run → FAIL. **Step 4:** Install exact `@nestjs/terminus@12.1.0` and implement. **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat(backend): consistent error responses and liveness/readiness endpoints`.

### Task 9: Next.js frontend

**Files:**
- Create: `apps/frontend/**` via `pnpm create next-app@16.4.5 apps/frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --skip-install --yes`; then `apps/frontend/src/env.ts`, `apps/frontend/src/lib/api-status.ts`, `apps/frontend/.env.example`
- Modify: `apps/frontend/src/app/page.tsx`, `apps/frontend/src/app/layout.tsx` (title "Collections Intelligence"), `apps/frontend/next.config.ts` (import `./src/env` so a bad env fails the build), `apps/frontend/package.json`

**Interfaces:**
- Produces:
  - `env = z.object({ API_BASE_URL: z.url() }).parse(process.env)` in `src/env.ts`. It is server-only (not `NEXT_PUBLIC_`): the browser never calls the API in Phase 1. *(My call: the spec said `NEXT_PUBLIC_API_BASE_URL`, but the status fetch runs server-side, so nothing needs to reach the browser.)*
  - `getApiStatus(): Promise<'ok' | 'unavailable'>`: fetches `${env.API_BASE_URL}/api/v1/health/ready` with `cache: 'no-store'` and `signal: AbortSignal.timeout(2000)`. `'ok'` iff `res.ok`; any throw → `'unavailable'`.
  - `page.tsx`: `export const dynamic = 'force-dynamic'`. Renders the heading "Collections Intelligence" and "API status: ok|unavailable". *(Moved to `src/app/status/page.tsx` when `/` became the landing page; the route is now `/status`.)*
  - Frontend scripts: `dev` (`next dev -p 3000`), `build`, `start`, `lint` (`eslint .`), `typecheck` (`tsc --noEmit`). No `test` script (spec: frontend test runner comes in 1b).

- [ ] **Step 1:** Scaffold, pin exact versions (next 16.4.5, react/react-dom 19.3.1, tailwindcss 4.3.4, typescript 5.9.3, zod 4.6.7), extend the root tsconfig, remove the scaffold's prettier config, `.env.example` = `API_BASE_URL=http://localhost:3001`.
- [ ] **Step 2:** Implement `env.ts`, `api-status.ts`, page and layout. Strip the scaffold demo content.
- [ ] **Step 3:** Verify: `pnpm --filter frontend lint`, `typecheck`, and `API_BASE_URL=http://localhost:3001 pnpm --filter frontend build` exit 0. `API_BASE_URL=nope pnpm --filter frontend build` exits non-zero naming `API_BASE_URL`. With `pnpm dev` running, `curl -s localhost:3000/status | grep 'API status: ok'` matches; stop the backend and it shows `unavailable`.
- [ ] **Step 4:** Commit `feat(frontend): scaffold Next.js dashboard shell with validated env`.

### Task 10: Backend Dockerfile

**Files:**
- Create: `apps/backend/Dockerfile`, `.dockerignore` (root; build context is the repo root)

**Interfaces:**
- Image contract for Cloud Run: listens on `$PORT` (via the existing env schema), runs as user `node`, `CMD ["node", "dist/main.js"]`, contains no `.env*` files and no dev deps.

- [ ] **Step 1:** Multi-stage on `node:24-slim`. Build stage: `corepack enable`, `pnpm install --frozen-lockfile --filter backend...`, `prisma generate`, `pnpm --filter backend build`, then `pnpm --filter backend deploy --prod /out` (if pnpm 12 requires it, set `inject-workspace-packages=true` in `.npmrc` or use `--legacy`, and note which). Runtime stage copies `/out`. `.dockerignore`: `**/node_modules`, `**/.env*`, `!**/.env.example`, `**/dist`, `**/.next`, `.git`.
- [ ] **Step 2:** Verify: `docker build -f apps/backend/Dockerfile -t collections-backend .` succeeds. `docker run --rm -e DATABASE_URL=postgresql://u:p@host.docker.internal:5432/x -e PORT=8080 -p 8080:8080 collections-backend` → `curl localhost:8080/api/v1/health/live` 200. `docker run --rm collections-backend whoami` → `node`. `docker run --rm collections-backend sh -c 'ls -a; find / -name ".env" -not -path "/proc/*" 2>/dev/null'` lists no `.env`.
- [ ] **Step 3:** Commit `build(backend): Cloud Run-ready container image`.

### Task 11: Documentation and final verification

**Files:**
- Modify: `README.md`, `CLAUDE.md` (append section "26. Repository commands and tenancy implementation")

- [ ] **Step 1:** README: prerequisites (Node 24, `corepack enable`, Docker/OrbStack); setup (copy both `.env.example` files, generate passwords, `pnpm install`, `pnpm db:up`, `pnpm db:migrate`, `pnpm db:seed`); run (`pnpm dev`, ports 3000/3001, the dev `x-tenant-id` header with the demo tenant ids); test commands incl. a single test (`pnpm --filter backend test -- env.schema`, `pnpm test:integration -- -t "no pool leakage"`); migration workflow (RLS SQL via `--create-only`; `app_user` bootstrap must be replicated on Cloud SQL); troubleshooting (port 5432 in use → `POSTGRES_PORT`; `db:reset` re-runs init scripts).
- [ ] **Step 2:** CLAUDE.md §26: the command list. Tenancy rules as implemented: access tenant data only via `TenantTransactionRunner` + repositories; new tenant-owned tables need a `tenant_id` column plus an RLS migration copying the `tenant_isolation` policy plus an isolation test; never connect the app as `app_owner`.
- [ ] **Step 3: Full verification from clean** (`superpowers:verification-before-completion`): `git clean -xfd -e .env -e apps/backend/.env -e apps/frontend/.env` (confirm with user first), `pnpm install`, `pnpm db:reset`, `pnpm db:migrate:deploy`, `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build`. All exit 0; paste the summary lines.
- [ ] **Step 4:** Commit `docs: setup guide and tenancy conventions`. Then `superpowers:requesting-code-review` on the branch and `superpowers:finishing-a-development-branch`.
