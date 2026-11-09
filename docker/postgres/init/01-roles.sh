#!/usr/bin/env bash
# Runs once, on first start of an empty data volume, as POSTGRES_USER (app_owner).
# Creates the runtime role app_user, which cannot bypass row-level security,
# and the test database. Prisma migrations run as app_owner and own all tables;
# default privileges give app_user DML-only access to them.
set -euo pipefail

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set in .env}"

# The password is read inside psql with \getenv, so it never appears in argv or output.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv pw APP_DB_PASSWORD
CREATE ROLE app_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'pw';
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE collections_test OWNER \"$POSTGRES_USER\""

for db in "$POSTGRES_DB" collections_test; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<SQL
GRANT CONNECT ON DATABASE "$db" TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
SQL
done
