import { Prisma, type PrismaClient } from '../../src/generated/prisma/client.js';
import { ownerClient, resetDb, seedTwoTenants } from '../support/db.js';
import { createBookingGraph } from '../support/graph.js';

describe('money mirror: demands, payments', () => {
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

  const payment = (
    tenantId: string,
    bookingId: string,
    demandId: string | null,
    externalId: string,
    amount: string,
  ) => ({
    tenantId,
    source: 'DEMO' as const,
    externalId,
    lastSyncedAt: new Date(),
    bookingId,
    demandId,
    amount,
    paidAt: new Date(),
    payerType: 'BUYER' as const,
  });

  it('money keeps exact paise', async () => {
    const g = await createBookingGraph(owner, ids.a, { amountDue: '620000.10' });
    const demand = await owner.demand.findUniqueOrThrow({ where: { id: g.demandId } });
    expect(demand.amountDue).toBeInstanceOf(Prisma.Decimal);
    expect(demand.amountDue.toString()).toBe('620000.1');

    await owner.payment.create({ data: payment(ids.a, g.bookingId, g.demandId, 'R-1', '0.10') });
    await owner.payment.create({ data: payment(ids.a, g.bookingId, g.demandId, 'R-2', '0.20') });
    const sum = await owner.payment.aggregate({
      where: { demandId: g.demandId },
      _sum: { amount: true },
    });
    expect(sum._sum.amount?.toString()).toBe('0.3');
  });

  it('more than two decimals is rounded by Postgres to 2 places', async () => {
    // Postgres rounds numeric(14,2) on insert without error: 1.005 is stored as 1.01. The database
    // will not reject it, so the CRM sync must reject amounts with more than 2 decimals before writing.
    const g = await createBookingGraph(owner, ids.a, { amountDue: '1.005' });
    const demand = await owner.demand.findUniqueOrThrow({ where: { id: g.demandId } });
    expect(demand.amountDue.toString()).toBe('1.01');
  });

  it('negative amount_due rejects', async () => {
    await expect(createBookingGraph(owner, ids.a, { amountDue: '-1.00' })).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });

  it('zero payment rejects', async () => {
    const g = await createBookingGraph(owner, ids.a);
    await expect(
      owner.payment.create({ data: payment(ids.a, g.bookingId, g.demandId, 'R-0', '0.00') }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });

  it('bank share above amount_due rejects', async () => {
    await expect(
      createBookingGraph(owner, ids.a, { amountDue: '620000', expectedBankAmount: '700000' }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });

  it('negative bank share rejects', async () => {
    await expect(
      createBookingGraph(owner, ids.a, { expectedBankAmount: '-1.00' }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });

  it('payment without a demand is allowed', async () => {
    const g = await createBookingGraph(owner, ids.a);
    await expect(
      owner.payment.create({ data: payment(ids.a, g.bookingId, null, 'R-N', '100.00') }),
    ).resolves.toBeTruthy();
  });

  it("payment cannot point at another tenant's demand", async () => {
    const ga = await createBookingGraph(owner, ids.a);
    const gb = await createBookingGraph(owner, ids.b);
    await expect(
      owner.payment.create({ data: payment(ids.a, ga.bookingId, gb.demandId, 'R-X', '10.00') }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
