import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ownerClient, resetDb } from '../support/db.js';

// Every tenant-owned table. Each later task appends its tables here.
export const TENANT_TABLES: readonly string[] = [
  'tenants',
  'users',
  'projects',
  'towers',
  'units',
  'persons',
  'bookings',
  'booking_applicants',
  'demands',
  'payments',
  'integration_connections',
  'sync_runs',
  'collection_policies',
  'cadence_steps',
  'approved_talking_points',
  'collection_cases',
  'case_demands',
  'scheduled_calls',
  'call_attempts',
  'payment_promises',
  'outbound_messages',
  'escalations',
];

describe('schema coverage guard', () => {
  let owner: PrismaClient;

  beforeAll(() => {
    owner = ownerClient();
  });

  afterAll(async () => {
    await owner.$disconnect();
  });

  it('every listed table has forced RLS and a tenant_isolation policy', async () => {
    for (const table of TENANT_TABLES) {
      const [cls] = await owner.$queryRaw<{ rls: boolean; forced: boolean }[]>`
        SELECT relrowsecurity AS rls, relforcerowsecurity AS forced
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = ${table}`;
      expect(cls?.rls, `${table} RLS enabled`).toBe(true);
      expect(cls?.forced, `${table} RLS forced`).toBe(true);

      const policies = await owner.$queryRaw<{ policyname: string }[]>`
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ${table} AND policyname = 'tenant_isolation'`;
      expect(policies, `${table} tenant_isolation policy`).toHaveLength(1);
    }
  });

  it('every table with a tenant_id column is listed', async () => {
    const rows = await owner.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tenant_id'`;
    const unlisted = rows.map((r) => r.table_name).filter((t) => !TENANT_TABLES.includes(t));
    expect(unlisted).toEqual([]);
  });

  it('no money is stored as float', async () => {
    const rows = await owner.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type IN ('real', 'double precision')`;
    expect(rows).toEqual([]);
  });

  it('all timestamps carry a time zone', async () => {
    const rows = await owner.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
        AND data_type = 'timestamp without time zone'`;
    expect(rows).toEqual([]);
  });

  it('users.role defaults to AGENT', async () => {
    await resetDb(owner);
    const tenant = await owner.tenant.create({ data: { name: 'Guard Tenant' } });
    const user = await owner.user.create({
      data: { tenantId: tenant.id, email: 'role@guard.test' },
    });
    expect(user.role).toBe('AGENT');
  });
});
