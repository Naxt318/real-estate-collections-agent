-- Cross-tenant access path for background jobs and webhooks. app_user is NOBYPASSRLS, so these two
-- SECURITY DEFINER functions (owned by the migration role, which bypasses RLS) are the only
-- sanctioned way to read across tenants. search_path is pinned so callers cannot shadow objects.

CREATE FUNCTION app_active_tenant_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT id FROM tenants WHERE status = 'ACTIVE' ORDER BY id $$;

CREATE FUNCTION app_resolve_integration_connection(p_connection_id uuid)
RETURNS TABLE (tenant_id uuid, source "CrmSource", secret_ref text, status "IntegrationStatus")
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT c.tenant_id, c.source, c.secret_ref, c.status
  FROM integration_connections c
  WHERE c.id = p_connection_id
$$;

REVOKE ALL ON FUNCTION app_active_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_active_tenant_ids() TO app_user;
REVOKE ALL ON FUNCTION app_resolve_integration_connection(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_integration_connection(uuid) TO app_user;
