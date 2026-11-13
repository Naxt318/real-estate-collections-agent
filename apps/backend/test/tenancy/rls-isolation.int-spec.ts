import { TenantContext } from '../../src/common/tenancy/tenant-context.js';
import { InvalidTenantIdError } from '../../src/common/tenancy/tenancy.errors.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { TenantTransactionRunner } from '../../src/infrastructure/database/tenant-transaction-runner.js';
import { UsersRepository } from '../../src/users/users.repository.js';
import { appClient, ownerClient, resetDb, seedTwoTenants } from '../support/db.js';

describe('RLS tenant isolation', () => {
  let owner: PrismaClient;
  let clients: PrismaClient[] = [];
  let ids: { a: string; b: string; suspended: string };

  const ctx = new TenantContext();
  const repo = new UsersRepository(ctx);
  const makeApp = (opts?: { poolMax?: number }) => {
    const client = appClient(opts);
    clients.push(client);
    return { client, runner: new TenantTransactionRunner(client, ctx) };
  };

  beforeAll(() => {
    owner = ownerClient();
  });

  beforeEach(async () => {
    await resetDb(owner);
    ids = await seedTwoTenants(owner);
  });

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.$disconnect()));
    clients = [];
  });

  afterAll(async () => {
    await owner.$disconnect();
  });

  it('(a) lists only the current tenant users', async () => {
    const { runner } = makeApp();
    const a = await runner.runAs(ids.a, (tx) => repo.list(tx));
    const b = await runner.runAs(ids.b, (tx) => repo.list(tx));
    expect(a.map((u) => u.email)).toEqual(['a@a.test']);
    expect(b.map((u) => u.email)).toEqual(['b@b.test']);
  });

  it('(b) returns nothing without a tenant context', async () => {
    const { client } = makeApp();
    expect(await client.user.findMany()).toEqual([]);
    expect(await client.tenant.findMany()).toEqual([]);
  });

  it('(c) rejects writing a row for another tenant', async () => {
    const { runner } = makeApp();
    await expect(
      runner.runAs(ids.a, (tx) => tx.user.create({ data: { tenantId: ids.b, email: 'x@y.test' } })),
    ).rejects.toThrow(/row-level security/);
  });

  it('(d) does not leak tenant context to the next use of a pooled connection', async () => {
    const { client, runner } = makeApp({ poolMax: 1 });
    await runner.runAs(ids.a, (tx) => repo.list(tx));
    expect(await client.user.findMany()).toEqual([]);
  });

  it('(d2) does not leak tenant context after a rolled-back transaction', async () => {
    const { client, runner } = makeApp({ poolMax: 1 });
    await expect(
      runner.runAs(ids.a, async (tx) => {
        await repo.list(tx);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await client.user.findMany()).toEqual([]);
  });

  it('(e) keeps interleaved concurrent tenants isolated', async () => {
    const { runner } = makeApp({ poolMax: 5 });
    const calls = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? ids.a : ids.b));
    const results = await Promise.all(
      calls.map(async (tenantId) => ({
        tenantId,
        users: await runner.runAs(tenantId, (tx) => repo.list(tx)),
      })),
    );
    for (const { tenantId, users } of results) {
      expect(users).toHaveLength(1);
      expect(users.every((u) => u.tenantId === tenantId)).toBe(true);
    }
  });

  it('(f) rejects a non-UUID tenant id and runs as a non-bypass role', async () => {
    const { client, runner } = makeApp();
    await expect(runner.runAs('not-a-uuid', (tx) => repo.list(tx))).rejects.toThrow(
      InvalidTenantIdError,
    );
    const rows = await client.$queryRaw<
      { rolbypassrls: boolean }[]
    >`select rolbypassrls from pg_roles where rolname = current_user`;
    expect(rows[0]?.rolbypassrls).toBe(false);
  });

  it('(g) normalises emails and scopes uniqueness per tenant', async () => {
    const { runner } = makeApp();
    const created = await runner.runAs(ids.a, (tx) => repo.create(tx, { email: ' A@X.test ' }));
    expect(created.email).toBe('a@x.test');
    await expect(
      runner.runAs(ids.a, (tx) => repo.create(tx, { email: 'a@x.test' })),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      runner.runAs(ids.b, (tx) => repo.create(tx, { email: 'a@x.test' })),
    ).resolves.toMatchObject({ tenantId: ids.b });
  });

  it('(h) clamps take to 100', async () => {
    await owner.user.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({ tenantId: ids.a, email: `u${i}@a.test` })),
    });
    const { runner } = makeApp();
    const users = await runner.runAs(ids.a, (tx) => repo.list(tx, { take: 1000 }));
    expect(users).toHaveLength(100);
  });
});
