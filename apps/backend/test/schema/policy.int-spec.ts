import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ownerClient, resetDb, seedTwoTenants } from '../support/db.js';

// Postgres SQLSTATE codes surface at meta.driverAdapterError.cause.code on Prisma errors.
const checkViolation = {
  meta: { driverAdapterError: { cause: { code: '23514' } } },
};

// Prisma returns a TIME column as a Date on 1970-01-01 (UTC).
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

describe('integration and policy', () => {
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

  it('policy defaults match the approved values', async () => {
    const policy = await owner.collectionPolicy.create({ data: { tenantId: ids.a } });
    expect(policy.maxPromiseDeferralDays).toBe(15);
    expect(policy.callingWindowStart.toISOString().slice(11, 16)).toBe('10:00');
    expect(policy.callingWindowEnd.toISOString().slice(11, 16)).toBe('19:00');
    expect(policy.timezone).toBe('Asia/Kolkata');
    expect(policy.maxCallAttemptsPerCase).toBe(6);
    expect(policy.contactRiskSkipThreshold).toBe(70);
    expect(policy.defaultLateInterestRatePa).toBeNull();
  });

  it('one policy per tenant', async () => {
    await owner.collectionPolicy.create({ data: { tenantId: ids.a } });
    await expect(
      owner.collectionPolicy.create({ data: { tenantId: ids.a } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await owner.collectionPolicy.create({ data: { tenantId: ids.b } });
  });

  it.each([
    ['risk threshold above 100', { contactRiskSkipThreshold: 101 }],
    [
      'inverted calling window',
      { callingWindowStart: time('19:00'), callingWindowEnd: time('10:00') },
    ],
    ['zero call attempts', { maxCallAttemptsPerCase: 0 }],
    ['negative deferral days', { maxPromiseDeferralDays: -1 }],
  ])('invalid policy values reject: %s', async (_name, overrides) => {
    await expect(
      owner.collectionPolicy.create({ data: { tenantId: ids.a, ...overrides } }),
    ).rejects.toMatchObject(checkViolation);
  });

  it('one connection per source per tenant', async () => {
    const data = { tenantId: ids.a, source: 'DEMO' as const, secretRef: 'projects/x/secrets/y' };
    await owner.integrationConnection.create({ data });
    await expect(owner.integrationConnection.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
    await owner.integrationConnection.create({ data: { ...data, tenantId: ids.b } });
  });

  it('a sync run cannot point at another tenant connection', async () => {
    const conn = await owner.integrationConnection.create({
      data: { tenantId: ids.b, source: 'DEMO', secretRef: 's' },
    });
    await expect(
      owner.syncRun.create({
        data: { tenantId: ids.a, connectionId: conn.id, startedAt: new Date() },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    const run = await owner.syncRun.create({
      data: { tenantId: ids.b, connectionId: conn.id, startedAt: new Date() },
    });
    expect(run.status).toBe('RUNNING');
    expect(run.counts).toEqual({});
  });

  it('cadence offsets are unique per tenant', async () => {
    await owner.cadenceStep.create({ data: { tenantId: ids.a, dayOffset: 0 } });
    await expect(
      owner.cadenceStep.create({ data: { tenantId: ids.a, dayOffset: 0 } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await owner.cadenceStep.create({ data: { tenantId: ids.b, dayOffset: 0 } });
  });

  it('cadence repeat interval must be at least one day', async () => {
    await expect(
      owner.cadenceStep.create({ data: { tenantId: ids.a, dayOffset: 5, repeatEveryDays: 0 } }),
    ).rejects.toMatchObject(checkViolation);
  });

  it('talking point keys are unique per tenant', async () => {
    const data = { tenantId: ids.a, key: 'rera', text: 'Approved text' };
    const tp = await owner.approvedTalkingPoint.create({ data });
    expect(tp.active).toBe(true);
    expect(tp.requiresHomeLoan).toBe(false);
    await expect(owner.approvedTalkingPoint.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
  });
});
