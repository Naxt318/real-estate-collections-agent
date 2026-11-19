# Cloud SQL notes

Things that work locally only because the Docker Postgres `app_owner` is a superuser. Cloud SQL has no real superuser (`cloudsqlsuperuser` lacks SUPERUSER and BYPASSRLS), so each of these must be handled before the first Cloud SQL deploy.

## FORCE row-level security applies to the migration role

Every tenant table has `FORCE ROW LEVEL SECURITY` (see `apps/backend/prisma/migrations/20261112123603_enable_rls`). Locally, `app_owner` bypasses the policies because it is a superuser. On Cloud SQL the migration role is only the table owner, and FORCE applies the policies to the owner too. So, unless they set `app.tenant_id` first:

- `pnpm db:seed` sees 0 rows, and its inserts fail the policies' `WITH CHECK`.
- Any future data migration (an `UPDATE`/`INSERT` inside a migration) silently touches no rows or fails.

The comment in that migration ("only superusers (migrations, seed) bypass them") is accurate for local Docker only. Applied migrations are not edited, so this note is the correction.

Fix options, to choose when deploying: run seeds and data migrations per tenant with `set_config('app.tenant_id', …, true)` inside a transaction, or give a dedicated, NOLOGIN maintenance role targeted policies, in the same way as the `app_directory` role.
