import { TenantContext } from '../../src/common/tenancy/tenant-context.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { TenantTransactionRunner } from '../../src/infrastructure/database/tenant-transaction-runner.js';
import { appClient, ownerClient, resetDb, seedTwoTenants } from '../support/db.js';
import { createBookingGraph } from '../support/graph.js';

describe('risk scores, score events, audit log and outbox', () => {
  let owner: PrismaClient;
  let app: PrismaClient;
  let runner: TenantTransactionRunner;
  let ids: { a: string; b: string; suspended: string };

  beforeAll(() => {
    owner = ownerClient();
    app = appClient();
    runner = new TenantTransactionRunner(app, new TenantContext());
  });

  beforeEach(async () => {
    await resetDb(owner);
    ids = await seedTwoTenants(owner);
  });

  afterAll(async () => {
    await app.$disconnect();
    await owner.$disconnect();
  });

  const newPerson = async (tenantId: string) =>
    (await createBookingGraph(owner, tenantId)).personId;

  it('one score per person per kind', async () => {
    const personId = await newPerson(ids.a);
    const data = {
      tenantId: ids.a,
      personId,
      kind: 'CONTACT' as const,
      value: 40,
      band: 'MEDIUM' as const,
    };
    await owner.riskScore.create({ data });
    await expect(owner.riskScore.create({ data })).rejects.toMatchObject({ code: 'P2002' });
    // A different kind for the same person is fine.
    await owner.riskScore.create({ data: { ...data, kind: 'PAYMENT' } });
  });

  it('score outside 0-100 rejects', async () => {
    const personId = await newPerson(ids.a);
    await expect(
      owner.riskScore.create({
        data: { tenantId: ids.a, personId, kind: 'CONTACT', value: 101, band: 'HIGH' },
      }),
    ).rejects.toMatchObject({ meta: { driverAdapterError: { cause: { code: '23514' } } } });
    await expect(
      owner.scoreEvent.create({
        data: {
          tenantId: ids.a,
          personId,
          kind: 'CONTACT',
          delta: 10,
          valueAfter: 101,
          reason: 'too high',
          source: 'RULE',
        },
      }),
    ).rejects.toMatchObject({ meta: { driverAdapterError: { cause: { code: '23514' } } } });
  });

  it('app user cannot rewrite history', async () => {
    const personId = await newPerson(ids.a);
    const event = await runner.runAs(ids.a, (tx) =>
      tx.scoreEvent.create({
        data: {
          tenantId: ids.a,
          personId,
          kind: 'CONTACT',
          delta: 5,
          valueAfter: 45,
          reason: 'missed call',
          source: 'RULE',
        },
      }),
    );
    const audit = await runner.runAs(ids.a, (tx) =>
      tx.auditLog.create({
        data: {
          tenantId: ids.a,
          action: 'SCORE_CORRECTED',
          entityType: 'risk_score',
          entityId: personId,
          after: { value: 45 },
        },
      }),
    );

    await expect(
      runner.runAs(ids.a, (tx) =>
        tx.scoreEvent.update({ where: { id: event.id }, data: { reason: 'edited' } }),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      runner.runAs(ids.a, (tx) => tx.auditLog.delete({ where: { id: audit.id } })),
    ).rejects.toThrow(/permission denied/);
  });

  it('app user can mark outbox processed', async () => {
    const event = await runner.runAs(ids.a, (tx) =>
      tx.outboxEvent.create({
        data: { tenantId: ids.a, type: 'CallCompleted', payload: { callId: 'x' } },
      }),
    );
    const done = await runner.runAs(ids.a, (tx) =>
      tx.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } }),
    );
    expect(done.processedAt).not.toBeNull();
  });
});
