import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

export interface BookingGraphOpts {
  hasHomeLoan?: boolean;
  amountDue?: string;
  expectedBankAmount?: string | null;
  // Reuse this person (primary contact) instead of creating one.
  personId?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Creates one project, unit, person, booking and demand for a tenant, all with source DEMO and
// unique external ids, through the owner connection. The demand is due 10 days ago.
export async function createBookingGraph(
  owner: PrismaClient,
  tenantId: string,
  opts: BookingGraphOpts = {},
): Promise<{
  projectId: string;
  unitId: string;
  personId: string;
  bookingId: string;
  demandId: string;
}> {
  const key = randomUUID().slice(0, 8);
  const mirror = (suffix: string) => ({
    tenantId,
    source: 'DEMO' as const,
    externalId: `${suffix}-${key}`,
    lastSyncedAt: new Date(),
  });

  const project = await owner.project.create({ data: { ...mirror('P'), name: `Project ${key}` } });
  const unit = await owner.unit.create({
    data: { ...mirror('U'), projectId: project.id, unitNumber: `U-${key}` },
  });
  const personId =
    opts.personId ??
    (
      await owner.person.create({
        data: { ...mirror('C'), fullName: `Buyer ${key}`, primaryPhone: '+919876543210' },
      })
    ).id;
  const booking = await owner.booking.create({
    data: {
      ...mirror('B'),
      unitId: unit.id,
      planType: 'CONSTRUCTION_LINKED',
      status: 'ACTIVE',
      bookingDate: new Date('2026-01-15'),
      agreementValue: '7500000.00',
      hasHomeLoan: opts.hasHomeLoan ?? false,
      primaryContactPersonId: personId,
    },
  });
  const now = Date.now();
  const demand = await owner.demand.create({
    data: {
      ...mirror('D'),
      bookingId: booking.id,
      stageName: '8th slab',
      stageSequence: 8,
      demandDate: new Date(now - 40 * DAY_MS),
      dueDate: new Date(now - 10 * DAY_MS),
      amountDue: opts.amountDue ?? '620000.00',
      expectedBankAmount: opts.expectedBankAmount ?? null,
      status: 'RAISED',
    },
  });

  return {
    projectId: project.id,
    unitId: unit.id,
    personId,
    bookingId: booking.id,
    demandId: demand.id,
  };
}
