# Cloud SQL notes

Things that work locally only because the Docker Postgres `app_owner` is a superuser. Cloud SQL has no real superuser (`cloudsqlsuperuser` lacks SUPERUSER and BYPASSRLS), so each of these must be handled before the first Cloud SQL deploy.

## FORCE row-level security applies to the migration role

Every tenant table has `FORCE ROW LEVEL SECURITY` (see `apps/backend/prisma/migrations/20261112123603_enable_rls`). Locally, `app_owner` bypasses the policies because it is a superuser. On Cloud SQL the migration role is only the table owner, and FORCE applies the policies to the owner too. So, unless they set `app.tenant_id` first:

- `pnpm db:seed` sees 0 rows, and its inserts fail the policies' `WITH CHECK`.
- Any future data migration (an `UPDATE`/`INSERT` inside a migration) silently touches no rows or fails.

The comment in that migration ("only superusers (migrations, seed) bypass them") is accurate for local Docker only. Applied migrations are not edited, so this note is the correction.

Fix options, to choose when deploying: run seeds and data migrations per tenant with `set_config('app.tenant_id', …, true)` inside a transaction, or give a dedicated, NOLOGIN maintenance role targeted policies, in the same way as the `app_directory` role.

## The `app_directory` role needs CREATE on schema `public` while ownership changes

`20261113012611_directory_role` runs `ALTER FUNCTION … OWNER TO app_directory`. PostgreSQL only allows that when the new owner has CREATE on the function's schema (superusers are exempt). `app_directory` does not have it, so on Cloud SQL that migration fails with "permission denied for schema public". Before the first Cloud SQL deploy, add a migration that wraps the ownership change in a temporary `GRANT CREATE ON SCHEMA public TO app_directory` and `REVOKE CREATE ON SCHEMA public FROM app_directory`. Ownership does not need CREATE to persist.

## Grants must not be re-broadened

Migrations `REVOKE UPDATE, DELETE` on `score_events` and `audit_logs` from `app_user`. A Cloud SQL bootstrap script must create `app_user` and set default privileges before `migrate deploy`. It must never run a blanket `GRANT … ON ALL TABLES TO app_user`, which would silently undo the append-only revokes.
