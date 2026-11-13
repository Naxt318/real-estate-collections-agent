-- The two directory functions must not rely on a superuser owner (Cloud SQL has none). They now run
-- as app_directory: a NOLOGIN role that cannot bypass RLS and may read exactly two tables, through
-- dedicated SELECT policies. Nothing else gains access.

-- Roles are cluster-wide and the dev and test databases share a cluster, so create it only once.
-- A pre-existing role with more power than intended is refused rather than silently reused.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_directory') THEN
    CREATE ROLE app_directory NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSIF EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'app_directory' AND (rolsuper OR rolbypassrls OR rolcanlogin)
  ) THEN
    RAISE EXCEPTION 'role app_directory exists with LOGIN, SUPERUSER or BYPASSRLS';
  END IF;
END
$$;

-- A non-superuser migration role must be able to SET ROLE app_directory to hand it ownership.
GRANT app_directory TO CURRENT_USER;

GRANT USAGE ON SCHEMA public TO app_directory;
GRANT SELECT ON "tenants", "integration_connections" TO app_directory;

-- Permissive policies are OR-ed with tenant_isolation, so app_directory sees every row of these two
-- tables and, having no grant elsewhere, nothing else.
CREATE POLICY directory_read ON "tenants" FOR SELECT TO app_directory USING (true);
CREATE POLICY directory_read ON "integration_connections" FOR SELECT TO app_directory USING (true);

-- The return type gains tenant_status, which CREATE OR REPLACE cannot change.
DROP FUNCTION app_resolve_integration_connection(uuid);

CREATE FUNCTION app_resolve_integration_connection(p_connection_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  source "CrmSource",
  secret_ref text,
  status "IntegrationStatus",
  tenant_status "TenantStatus"
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT c.tenant_id, c.source, c.secret_ref, c.status, t.status
  FROM integration_connections c
  JOIN tenants t ON t.id = c.tenant_id
  WHERE c.id = p_connection_id
$$;

REVOKE ALL ON FUNCTION app_resolve_integration_connection(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_integration_connection(uuid) TO app_user;

ALTER FUNCTION app_active_tenant_ids() OWNER TO app_directory;
ALTER FUNCTION app_resolve_integration_connection(uuid) OWNER TO app_directory;
