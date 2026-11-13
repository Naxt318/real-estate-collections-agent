import { TenantContext } from '../../src/common/tenancy/tenant-context.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { TenantTransactionRunner } from '../../src/infrastructure/database/tenant-transaction-runner.js';
import { applyDemoDataset } from '../../prisma/seed/apply-demo-dataset.js';
import { buildDemoDataset } from '../../prisma/seed/demo-dataset.js';
import { DEMO_TENANTS } from '../../prisma/seed/demo-ids.js';
import { appClient, ownerClient, resetDb } from '../support/db.js';

describe('demo dataset seed', () => {
  let owner: PrismaClient;
  let app: PrismaClient;

  beforeAll(() => {
    owner = ownerClient();
    app = appClient();
  });

  beforeEach(() => resetDb(owner));

  afterAll(async () => {
    await Promise.all([owner.$disconnect(), app.$disconnect()]);
  });

  const counts = async () => ({
    persons: await owner.person.count(),
    bookings: await owner.booking.count(),
    demands: await owner.demand.count(),
    payments: await owner.payment.count(),
    cases: await owner.collectionCase.count(),
    caseDemands: await owner.caseDemand.count(),
    calls: await owner.callAttempt.count(),
    promises: await owner.paymentPromise.count(),
    scoreEvents: await owner.scoreEvent.count(),
    users: await owner.user.count(),
  });

  const seedAll = async () => {
    const asOf = new Date();
    await applyDemoDataset(owner, buildDemoDataset('A', asOf));
    await applyDemoDataset(owner, buildDemoDataset('B', asOf));
  };

  it('is idempotent: a second run adds no rows', async () => {
    await seedAll();
    const first = await counts();
    expect(first.persons).toBeGreaterThan(8);
    await seedAll();
    expect(await counts()).toEqual(first);
  });

  it('never rewrites score events, which are append-only', async () => {
    await applyDemoDataset(owner, buildDemoDataset('A', new Date('2026-11-01T00:00:00.000Z')));
    const before = await owner.scoreEvent.findMany({ orderBy: { id: 'asc' } });
    expect(before.length).toBeGreaterThan(0);
    await applyDemoDataset(owner, buildDemoDataset('A', new Date('2026-11-20T00:00:00.000Z')));
    expect(await owner.scoreEvent.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });

  it('keeps builder B from seeing builder A buyers', async () => {
    await seedAll();
    const runner = new TenantTransactionRunner(app, new TenantContext());
    const persons = await runner.runAs(DEMO_TENANTS.B.id, (tx) => tx.person.findMany());
    expect(persons.length).toBe(2);
    const aNames = (await owner.person.findMany({ where: { tenantId: DEMO_TENANTS.A.id } })).map(
      (p) => p.fullName,
    );
    expect(persons.some((p) => aNames.includes(p.fullName))).toBe(false);
  });
});
