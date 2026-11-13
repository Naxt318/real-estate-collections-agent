import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ownerClient, resetDb, seedTwoTenants } from '../support/db.js';

describe('bookings mirror: persons, bookings, booking_applicants', () => {
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

  const person = (tenantId: string, externalId: string, primaryPhone = '+919876543210') => ({
    tenantId,
    source: 'DEMO' as const,
    externalId,
    lastSyncedAt: new Date(),
    fullName: `Buyer ${externalId}`,
    primaryPhone,
  });

  const unit = async (tenantId: string, externalId: string) => {
    const p = await owner.project.create({
      data: {
        tenantId,
        source: 'DEMO',
        externalId: `P-${externalId}`,
        lastSyncedAt: new Date(),
        name: 'Project',
      },
    });
    return owner.unit.create({
      data: {
        tenantId,
        projectId: p.id,
        source: 'DEMO',
        externalId,
        lastSyncedAt: new Date(),
        unitNumber: externalId,
      },
    });
  };

  const booking = (tenantId: string, unitId: string, personId: string, externalId: string) => ({
    tenantId,
    source: 'DEMO' as const,
    externalId,
    lastSyncedAt: new Date(),
    unitId,
    planType: 'CONSTRUCTION_LINKED' as const,
    status: 'ACTIVE' as const,
    bookingDate: new Date('2026-01-15'),
    agreementValue: '7500000.00',
    primaryContactPersonId: personId,
  });

  it('phone must be E.164', async () => {
    await expect(
      owner.person.create({ data: person(ids.a, 'C-1', '9876543210') }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
    await expect(owner.person.create({ data: person(ids.a, 'C-2') })).resolves.toBeTruthy();
  });

  it('a person can hold two bookings and a booking can have two applicants', async () => {
    const p1 = await owner.person.create({ data: person(ids.a, 'C-1') });
    const p2 = await owner.person.create({ data: person(ids.a, 'C-2', '+919876543211') });
    const u1 = await unit(ids.a, 'U-1');
    const u2 = await unit(ids.a, 'U-2');
    const b1 = await owner.booking.create({ data: booking(ids.a, u1.id, p1.id, 'B-1') });
    await owner.booking.create({ data: booking(ids.a, u2.id, p1.id, 'B-2') });
    await owner.bookingApplicant.createMany({
      data: [
        { tenantId: ids.a, bookingId: b1.id, personId: p2.id, role: 'CO_APPLICANT', callOrder: 2 },
        { tenantId: ids.a, bookingId: b1.id, personId: p1.id, role: 'PRIMARY', callOrder: 1 },
      ],
    });
    expect(await owner.booking.count({ where: { primaryContactPersonId: p1.id } })).toBe(2);
    const rows = await owner.bookingApplicant.findMany({
      where: { bookingId: b1.id },
      orderBy: { callOrder: 'asc' },
    });
    expect(rows.map((r) => r.role)).toEqual(['PRIMARY', 'CO_APPLICANT']);
  });

  it('the same person cannot be added twice to one booking', async () => {
    const p1 = await owner.person.create({ data: person(ids.a, 'C-1') });
    const u1 = await unit(ids.a, 'U-1');
    const b1 = await owner.booking.create({ data: booking(ids.a, u1.id, p1.id, 'B-1') });
    const row = { tenantId: ids.a, bookingId: b1.id, personId: p1.id, role: 'PRIMARY' as const };
    await owner.bookingApplicant.create({ data: { ...row, callOrder: 1 } });
    await expect(
      owner.bookingApplicant.create({ data: { ...row, callOrder: 2 } }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('call_order must be positive', async () => {
    const p1 = await owner.person.create({ data: person(ids.a, 'C-1') });
    const u1 = await unit(ids.a, 'U-1');
    const b1 = await owner.booking.create({ data: booking(ids.a, u1.id, p1.id, 'B-1') });
    await expect(
      owner.bookingApplicant.create({
        data: { tenantId: ids.a, bookingId: b1.id, personId: p1.id, role: 'PRIMARY', callOrder: 0 },
      }),
    ).rejects.toMatchObject({ meta: { driverAdapterError: { cause: { code: '23514' } } } });
  });

  it("booking cannot name another tenant's person as primary contact", async () => {
    const other = await owner.person.create({ data: person(ids.b, 'C-1') });
    const u1 = await unit(ids.a, 'U-1');
    await expect(
      owner.booking.create({ data: booking(ids.a, u1.id, other.id, 'B-1') }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
