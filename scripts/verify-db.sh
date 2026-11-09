#!/usr/bin/env bash
# Verifies the local Postgres role setup from docker/postgres/init/01-roles.sh.
# Usage: pnpm db:verify   (needs `pnpm db:up` first; exits non-zero on any failure)
#
# app_user is what the backend connects as, so it must not be able to get around
# row-level security: no superuser, no BYPASSRLS, no DDL, password required.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "db:verify: .env not found (copy .env.example)" >&2; exit 2; }
set -a; . ./.env; set +a
: "${POSTGRES_USER:?}" "${POSTGRES_DB:?}" "${APP_DB_PASSWORD:?}"

DATABASES=("$POSTGRES_DB" collections_test)
PROBE=zz_db_verify_probe
failures=0
pass() { echo "  ok    $1"; }
fail() { echo "  FAIL  $1" >&2; failures=$((failures + 1)); }

# Admin queries: as the owner over the container's local socket.
owner() { docker compose exec -T -e PGOPTIONS='-c client_min_messages=warning' postgres psql -X -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -tAc "$2"; }

# app_user queries: over the compose network, so pg_hba requires the password
# (connections from inside the container are trusted and would prove nothing).
# PGPASSWORD is passed by name only, so it never appears in a command line.
as_app() {
  # --progress quiet keeps compose's own container messages out of the captured output.
  PGPASSWORD="$1" docker compose --progress quiet run --rm --no-deps -T -e PGPASSWORD postgres \
    psql -X -q -v ON_ERROR_STOP=1 -h postgres -U app_user -d "$2" -tAc "$3" 2>&1
}

cleanup() { for db in "${DATABASES[@]}"; do owner "$db" "DROP TABLE IF EXISTS $PROBE" >/dev/null 2>&1 || true; done; }
trap cleanup EXIT

echo "app_user role attributes"
attrs=$(owner "$POSTGRES_DB" "SELECT rolcanlogin, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = 'app_user'")
[[ "$attrs" == "t|f|f|f|f" ]] && pass "LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE" \
  || fail "expected login|super|bypassrls|createdb|createrole = t|f|f|f|f, got '${attrs:-<role missing>}'"

echo "authentication"
out=$(as_app "wrong-$RANDOM" "$POSTGRES_DB" "SELECT 1") || true
[[ "$out" == *"password authentication failed"* ]] && pass "wrong password rejected" || fail "wrong password was not rejected: $out"

for db in "${DATABASES[@]}"; do
  echo "$db"
  out=$(as_app "$APP_DB_PASSWORD" "$db" "SELECT current_user") || true
  [[ "$out" == "app_user" ]] && pass "app_user connects with its password" || { fail "app_user cannot connect: $out"; continue; }

  # A table created by the owner (as Prisma migrations will) must get DML-only grants by default.
  owner "$db" "DROP TABLE IF EXISTS $PROBE; CREATE TABLE $PROBE (id serial PRIMARY KEY, v text)"
  out=$(as_app "$APP_DB_PASSWORD" "$db" \
    "INSERT INTO $PROBE (v) VALUES ('a'); UPDATE $PROBE SET v = 'b'; DELETE FROM $PROBE; SELECT count(*) FROM $PROBE") || true
  [[ "$out" == "0" ]] && pass "SELECT/INSERT/UPDATE/DELETE and sequence use on owner tables" || fail "DML on owner table failed: $out"

  out=$(as_app "$APP_DB_PASSWORD" "$db" "DROP TABLE $PROBE") || true
  [[ "$out" == *"must be owner"* ]] && pass "cannot drop owner tables" || fail "app_user could drop an owner table: $out"

  out=$(as_app "$APP_DB_PASSWORD" "$db" "CREATE TABLE zz_db_verify_ddl (id int)") || true
  if [[ "$out" == *"permission denied for schema public"* ]]; then
    pass "cannot create tables in public"
  else
    fail "app_user could create a table: $out"
    owner "$db" "DROP TABLE IF EXISTS zz_db_verify_ddl" >/dev/null
  fi
done

if ((failures)); then echo "db:verify: $failures check(s) failed" >&2; exit 1; fi
echo "db:verify: all checks passed"
