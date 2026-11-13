import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ownerClient, resetDb, seedTwoTenants } from '../support/db.js';
import { createBookingGraph } from '../support/graph.js';

describe('payment promises, outbound messages and escalations', () => {
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

  // A case and one connected call for a fresh person in the tenant.
  async function setup(tenantId: string) {
    const { personId } = await createBookingGraph(owner, tenantId);
    const collectionCase = await owner.collectionCase.create({ data: { tenantId, personId } });
    const call = await owner.callAttempt.create({
      data: {
        tenantId,
        caseId: collectionCase.id,
        personId,
        startedAt: new Date(),
        connected: true,
      },
    });
    return { personId, caseId: collectionCase.id, callAttemptId: call.id };
  }

  it('promise defaults to PENDING and keeps exact amount', async () => {
    const s = await setup(ids.a);
    const promise = await owner.paymentPromise.create({
      data: {
        tenantId: ids.a,
        ...s,
        proposedDate: new Date('2026-12-01'),
        agreedDate: new Date('2026-12-05'),
        agreedAmount: '120000.00',
      },
    });
    expect(promise.status).toBe('PENDING');
    expect(promise.currency).toBe('INR');
    expect(promise.agreedAmount.toFixed(2)).toBe('120000.00');
  });

  it('zero promise amount rejects', async () => {
    const s = await setup(ids.a);
    await expect(
      owner.paymentPromise.create({
        data: { tenantId: ids.a, ...s, agreedDate: new Date('2026-12-05'), agreedAmount: '0.00' },
      }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });

  it('agreed date before the proposed date rejects', async () => {
    const s = await setup(ids.a);
    await expect(
      owner.paymentPromise.create({
        data: {
          tenantId: ids.a,
          ...s,
          proposedDate: new Date('2026-12-05'),
          agreedDate: new Date('2026-12-01'),
          agreedAmount: '1000.00',
        },
      }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });

  it('escalation can be assigned only to a same-tenant user', async () => {
    const s = await setup(ids.a);
    const userA = await owner.user.create({
      data: { tenantId: ids.a, email: 'lead@a.test', role: 'COLLECTIONS_LEAD' },
    });
    const userB = await owner.user.create({
      data: { tenantId: ids.b, email: 'lead@b.test', role: 'COLLECTIONS_LEAD' },
    });
    const base = {
      tenantId: ids.a,
      caseId: s.caseId,
      personId: s.personId,
      reason: 'DISPUTE',
    } as const;

    await expect(
      owner.escalation.create({ data: { ...base, assignedToUserId: userB.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });

    const ok = await owner.escalation.create({ data: { ...base, assignedToUserId: userA.id } });
    expect(ok.status).toBe('OPEN');
    expect(ok.assignedToUserId).toBe(userA.id);
  });

  it('message links to its promise', async () => {
    const s = await setup(ids.a);
    const promise = await owner.paymentPromise.create({
      data: { tenantId: ids.a, ...s, agreedDate: new Date('2026-12-05'), agreedAmount: '5000.00' },
    });
    const message = await owner.outboundMessage.create({
      data: {
        tenantId: ids.a,
        caseId: s.caseId,
        personId: s.personId,
        promiseId: promise.id,
        channel: 'EMAIL',
        paymentLinkUrl: 'https://demo.example/pay/abc',
        amount: '5000.00',
        sendAt: new Date('2026-12-05T04:30:00Z'),
      },
    });
    expect(message.status).toBe('SCHEDULED');
    expect(message.promiseId).toBe(promise.id);
    expect(message.amount.toFixed(2)).toBe('5000.00');
  });

  it('zero message amount rejects', async () => {
    const s = await setup(ids.a);
    await expect(
      owner.outboundMessage.create({
        data: {
          tenantId: ids.a,
          caseId: s.caseId,
          personId: s.personId,
          channel: 'SMS',
          paymentLinkUrl: 'https://demo.example/pay/abc',
          amount: '0.00',
          sendAt: new Date(),
        },
      }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });
});
