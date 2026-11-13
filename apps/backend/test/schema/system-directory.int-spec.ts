import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SystemDirectory } from '../../src/infrastructure/database/system-directory.js';
import { appClient, ownerClient, resetDb, seedTwoTenants } from '../support/db.js';

describe('system directory: the sanctioned cross-tenant read path', () => {
  let owner: PrismaClient;
  let app: PrismaClient;
  let directory: SystemDirectory;
  let ids: { a: string; b: string; suspended: string };

  beforeAll(() => {
    owner = ownerClient();
    app = appClient();
    directory = new SystemDirectory(app);
  });

  beforeEach(async () => {
    await resetDb(owner);
    ids = await seedTwoTenants(owner);
  });

  afterAll(async () => {
    await app.$disconnect();
    await owner.$disconnect();
  });

  it('lists active tenants only', async () => {
    expect(await directory.listActiveTenantIds()).toEqual([ids.a, ids.b].sort());
    // The function does not weaken RLS for ordinary queries on the same client.
    expect(await app.tenant.findMany()).toEqual([]);
  });

  it('resolves a connection without tenant context', async () => {
    const conn = await owner.integrationConnection.create({
      data: { tenantId: ids.a, source: 'DEMO', secretRef: 'secret/demo-a' },
    });
    expect(await directory.resolveIntegrationConnection(conn.id)).toEqual({
      tenantId: ids.a,
      source: 'DEMO',
      secretRef: 'secret/demo-a',
      status: 'ACTIVE',
    });
    expect(
      await directory.resolveIntegrationConnection('00000000-0000-4000-8000-000000000000'),
    ).toBeNull();
    expect(await directory.resolveIntegrationConnection('not-a-uuid')).toBeNull();
  });

  it('functions are locked down', async () => {
    const rows = await owner.$queryRaw<
      { proname: string; prosecdef: boolean; proconfig: string[] | null; public_exec: boolean }[]
    >`
      SELECT proname, prosecdef, proconfig,
             has_function_privilege('public', oid, 'EXECUTE') AS public_exec
      FROM pg_proc
      WHERE proname IN ('app_active_tenant_ids', 'app_resolve_integration_connection')
      ORDER BY proname`;
    expect(rows.map((r) => r.proname)).toEqual([
      'app_active_tenant_ids',
      'app_resolve_integration_connection',
    ]);
    for (const row of rows) {
      expect(row.prosecdef).toBe(true);
      expect(row.proconfig).toContain('search_path=public, pg_temp');
      expect(row.public_exec).toBe(false);
    }
  });
});
