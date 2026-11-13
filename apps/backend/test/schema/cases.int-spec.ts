import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ownerClient, resetDb, seedTwoTenants } from '../support/db.js';
import { createBookingGraph } from '../support/graph.js';

describe('collection cases and calls', () => {
  let owner: PrismaClient;
  let ids: { a: string; b: string; suspended: string };

  beforeAll(() => {
    owner = ownerClient();
  });

  beforeEach(async () => {
    await resetDb(owner);
    ids = await seedTwoTenants(owner);
  });

  afterAll(async () => {
    await owner.$disconnect();
  });

  it('one open case per person', async () => {
    const { personId } = await createBookingGraph(owner, ids.a);
    const first = await owner.collectionCase.create({ data: { tenantId: ids.a, personId } });
    expect(first.status).toBe('OPEN');
    expect(first.handledBy).toBe('AI');
    expect(first.attemptsCount).toBe(0);

    await expect(
      owner.collectionCase.create({ data: { tenantId: ids.a, personId } }),
    ).rejects.toMatchObject({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: { constraint: { index: 'collection_cases_one_open_per_person' } },
        },
      },
    });

    await owner.collectionCase.update({
      where: { id: first.id },
      data: { status: 'CLOSED_UNRESOLVED', closedAt: new Date() },
    });
    await owner.collectionCase.create({ data: { tenantId: ids.a, personId } });
  });

  it.each([
    ['a terminal status without closed_at', { status: 'PAID' as const }],
    ['closed_at on an open case', { status: 'OPEN' as const, closedAt: new Date() }],
    ['closed_at on an escalated case', { status: 'ESCALATED' as const, closedAt: new Date() }],
  ])('closed_at must match a terminal status: rejects %s', async (_name, data) => {
    const { personId } = await createBookingGraph(owner, ids.a);
    await expect(
      owner.collectionCase.create({ data: { tenantId: ids.a, personId, ...data } }),
    ).rejects.toMatchObject({ meta: { driverAdapterError: { cause: { code: '23514' } } } });
  });

  it.each(['PAID', 'CLOSED_UNRESOLVED'] as const)(
    'a %s case with closed_at is accepted',
    async (status) => {
      const { personId } = await createBookingGraph(owner, ids.a);
      await expect(
        owner.collectionCase.create({
          data: { tenantId: ids.a, personId, status, closedAt: new Date() },
        }),
      ).resolves.toBeTruthy();
    },
  );

  it('a demand is active in at most one case', async () => {
    const g = await createBookingGraph(owner, ids.a);
    const g2 = await createBookingGraph(owner, ids.a);
    const case1 = await owner.collectionCase.create({
      data: { tenantId: ids.a, personId: g.personId },
    });
    const case2 = await owner.collectionCase.create({
      data: { tenantId: ids.a, personId: g2.personId },
    });
    const link = await owner.caseDemand.create({
      data: { tenantId: ids.a, caseId: case1.id, demandId: g.demandId },
    });

    await expect(
      owner.caseDemand.create({
        data: { tenantId: ids.a, caseId: case2.id, demandId: g.demandId },
      }),
    ).rejects.toMatchObject({
      code: 'P2002',
      meta: {
        driverAdapterError: { cause: { constraint: { index: 'case_demands_one_active_case' } } },
      },
    });

    await owner.caseDemand.update({ where: { id: link.id }, data: { removedAt: new Date() } });
    await owner.caseDemand.create({
      data: { tenantId: ids.a, caseId: case2.id, demandId: g.demandId },
    });
  });

  it('a combined case holds demands from two bookings', async () => {
    const g1 = await createBookingGraph(owner, ids.a);
    const g2 = await createBookingGraph(owner, ids.a, { personId: g1.personId });
    const c = await owner.collectionCase.create({
      data: { tenantId: ids.a, personId: g1.personId },
    });
    await owner.caseDemand.create({
      data: { tenantId: ids.a, caseId: c.id, demandId: g1.demandId },
    });
    await owner.caseDemand.create({
      data: { tenantId: ids.a, caseId: c.id, demandId: g2.demandId },
    });
    expect(await owner.caseDemand.count({ where: { caseId: c.id } })).toBe(2);
  });

  it('case cannot reference another tenant person', async () => {
    const { personId } = await createBookingGraph(owner, ids.b);
    await expect(
      owner.collectionCase.create({ data: { tenantId: ids.a, personId } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('call attempt defaults', async () => {
    const { personId } = await createBookingGraph(owner, ids.a);
    const c = await owner.collectionCase.create({ data: { tenantId: ids.a, personId } });
    const attempt = await owner.callAttempt.create({
      data: { tenantId: ids.a, caseId: c.id, personId, startedAt: new Date(), connected: false },
    });
    expect(attempt.hostility).toBe('NONE');
    expect(attempt.outcome).toBeNull();
    expect(attempt.scheduledCallId).toBeNull();
  });

  it('a scheduled call defaults to pending and takes a free-text skip reason', async () => {
    const { personId } = await createBookingGraph(owner, ids.a);
    const c = await owner.collectionCase.create({ data: { tenantId: ids.a, personId } });
    const call = await owner.scheduledCall.create({
      data: { tenantId: ids.a, caseId: c.id, personId, scheduledFor: new Date() },
    });
    expect(call.status).toBe('PENDING');
    const skipped = await owner.scheduledCall.update({
      where: { id: call.id },
      data: { status: 'SKIPPED', skipReason: 'LOAN_SPLIT_UNKNOWN' },
    });
    expect(skipped.skipReason).toBe('LOAN_SPLIT_UNKNOWN');
  });
});
