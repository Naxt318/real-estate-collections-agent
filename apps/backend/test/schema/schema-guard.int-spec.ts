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
  'risk_scores',
  'score_events',
  'audit_logs',
  'outbox_events',
];

// The tenant_isolation predicate as Postgres normalises it in pg_policies.
const isolationPredicate = (column: string) =>
  `(${column} = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`;

// The only policies besides tenant_isolation: app_directory's reads for the directory functions.
const DIRECTORY_READ_TABLES = ['integration_connections', 'tenants'];

// Foreign keys the app filters by, as (tenant_id, column) indexes. Lists only FKs that no
// unique key or other index already covers.
const TENANT_FK_INDEXES: readonly [string, string[]][] = [
  ['case_demands', ['case_id']],
  ['scheduled_calls', ['case_id']],
  ['scheduled_calls', ['person_id']],
  ['call_attempts', ['scheduled_call_id']],
  ['call_attempts', ['case_id']],
  ['call_attempts', ['person_id']],
  ['payment_promises', ['case_id']],
  ['payment_promises', ['person_id']],
  ['payment_promises', ['call_attempt_id']],
  ['outbound_messages', ['person_id']],
  ['outbound_messages', ['promise_id']],
  ['escalations', ['case_id']],
  ['escalations', ['person_id']],
  ['escalations', ['call_attempt_id']],
  ['escalations', ['assigned_to_user_id']],
  ['score_events', ['actor_user_id']],
  ['score_events', ['call_attempt_id']],
  ['audit_logs', ['actor_user_id']],
  ['audit_logs', ['entity_type', 'entity_id']],
  ['collection_cases', ['person_id']],
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

      const policies = await owner.$queryRaw<
        { permissive: string; cmd: string; roles: string[]; qual: string; with_check: string }[]
      >`
        SELECT permissive, cmd, roles::text[] AS roles, qual, with_check FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ${table} AND policyname = 'tenant_isolation'`;
      const predicate = isolationPredicate(table === 'tenants' ? 'id' : 'tenant_id');
      expect(policies, `${table} tenant_isolation policy`).toEqual([
        {
          permissive: 'PERMISSIVE',
          cmd: 'ALL',
          roles: ['public'],
          qual: predicate,
          with_check: predicate,
        },
      ]);
    }
  });

  it('the only other policies are the two app_directory reads', async () => {
    const rows = await owner.$queryRaw<
      { tablename: string; policyname: string; permissive: string; cmd: string; roles: string[] }[]
    >`
      SELECT tablename, policyname, permissive, cmd, roles::text[] AS roles FROM pg_policies
      WHERE schemaname = 'public' AND policyname <> 'tenant_isolation'
      ORDER BY tablename, policyname`;
    expect(rows).toEqual(
      DIRECTORY_READ_TABLES.map((tablename) => ({
        tablename,
        policyname: 'directory_read',
        permissive: 'PERMISSIVE',
        cmd: 'SELECT',
        roles: ['app_directory'],
      })),
    );
  });

  it('every FK between tenant-owned tables leads with tenant_id on both sides', async () => {
    const rows = await owner.$queryRaw<
      {
        conname: string;
        child: string;
        parent: string;
        child_first: string;
        parent_first: string;
      }[]
    >`
      SELECT con.conname,
             con.conrelid::regclass::text AS child,
             con.confrelid::regclass::text AS parent,
             (SELECT attname FROM pg_attribute
              WHERE attrelid = con.conrelid AND attnum = con.conkey[1]) AS child_first,
             (SELECT attname FROM pg_attribute
              WHERE attrelid = con.confrelid AND attnum = con.confkey[1]) AS parent_first
      FROM pg_constraint con
      JOIN pg_namespace n ON n.oid = con.connamespace
      WHERE con.contype = 'f' AND n.nspname = 'public'`;
    const tenantOwned = rows.filter(
      (r) =>
        r.parent !== 'tenants' &&
        TENANT_TABLES.includes(r.child) &&
        TENANT_TABLES.includes(r.parent),
    );
    expect(tenantOwned.length).toBeGreaterThan(20);
    const bad = tenantOwned.filter(
      (r) => r.child_first !== 'tenant_id' || r.parent_first !== 'tenant_id',
    );
    expect(bad.map((r) => r.conname)).toEqual([]);
  });

  it.each(TENANT_FK_INDEXES)('%s has a (tenant_id, %s) index', async (table, columns) => {
    const wanted = ['tenant_id', ...columns];
    const rows = await owner.$queryRaw<{ indexname: string; cols: string[]; partial: boolean }[]>`
      SELECT ic.relname AS indexname, i.indpred IS NOT NULL AS partial,
             ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum, ord)
                   JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
                   ORDER BY k.ord) AS cols
      FROM pg_index i
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_namespace n ON n.oid = tc.relnamespace
      WHERE n.nspname = 'public' AND tc.relname = ${table}`;
    const leading = rows.filter((r) => !r.partial && wanted.every((col, i) => r.cols[i] === col));
    expect(
      leading.map((r) => r.indexname),
      `${table} (${wanted.join(', ')})`,
    ).not.toEqual([]);
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
