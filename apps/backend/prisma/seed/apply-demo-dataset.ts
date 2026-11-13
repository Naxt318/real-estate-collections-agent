import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { DemoDataset } from './demo-dataset.js';

// Upserts by deterministic id, parents before children, so it can run any number of times.
export async function applyDemoDataset(owner: PrismaClient, ds: DemoDataset): Promise<void> {
  const { id, name } = ds.tenant;
  await owner.tenant.upsert({ where: { id }, update: { name }, create: { id, name } });

  // Users predate deterministic ids, so match them on their unique (tenant, email).
  for (const u of ds.users) {
    await owner.user.upsert({
      where: { tenantId_email: { tenantId: u.tenantId, email: u.email } },
      update: { name: u.name, role: u.role },
      create: u,
    });
  }

  // Each loop is one table; `update` is the whole row, so a re-run refreshes asOf-relative dates.
  for (const r of ds.integrationConnections)
    await owner.integrationConnection.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.collectionPolicies)
    await owner.collectionPolicy.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.cadenceSteps)
    await owner.cadenceStep.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.approvedTalkingPoints)
    await owner.approvedTalkingPoint.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.projects)
    await owner.project.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.towers)
    await owner.tower.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.units) await owner.unit.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.persons)
    await owner.person.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.bookings)
    await owner.booking.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.bookingApplicants)
    await owner.bookingApplicant.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.demands)
    await owner.demand.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.payments)
    await owner.payment.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.collectionCases)
    await owner.collectionCase.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.caseDemands)
    await owner.caseDemand.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.callAttempts)
    await owner.callAttempt.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.paymentPromises)
    await owner.paymentPromise.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.escalations)
    await owner.escalation.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.riskScores)
    await owner.riskScore.upsert({ where: { id: r.id }, update: r, create: r });
  for (const r of ds.scoreEvents)
    await owner.scoreEvent.upsert({ where: { id: r.id }, update: r, create: r });
}
