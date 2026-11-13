import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// app_owner is a superuser, so it bypasses RLS: use it only to seed and reset data.
export function ownerClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv('TEST_MIGRATION_DATABASE_URL') }),
  });
}

// app_user is NOBYPASSRLS, like the running application.
export function appClient(opts: { poolMax?: number } = {}): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireEnv('TEST_DATABASE_URL'),
      max: opts.poolMax,
    }),
  });
}

export async function resetDb(owner: PrismaClient): Promise<void> {
  // Every public table except Prisma's own bookkeeping, so later migrations never need to edit this.
  const rows = await owner.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename.replaceAll('"', '""')}"`).join(', ');
  await owner.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}

// Two active tenants with one user each, plus a suspended tenant.
export async function seedTwoTenants(
  owner: PrismaClient,
): Promise<{ a: string; b: string; suspended: string }> {
  const a = await owner.tenant.create({
    data: { name: 'Builder A', users: { create: { email: 'a@a.test', name: 'User A' } } },
  });
  const b = await owner.tenant.create({
    data: { name: 'Builder B', users: { create: { email: 'b@b.test', name: 'User B' } } },
  });
  const suspended = await owner.tenant.create({ data: { name: 'Suspended', status: 'SUSPENDED' } });
  return { a: a.id, b: b.id, suspended: suspended.id };
}
