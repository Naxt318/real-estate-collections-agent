import { buildDemoDataset } from './demo-dataset.js';
import { DEMO_TENANTS, demoUuid } from './demo-ids.js';

const asOf = new Date('2026-11-13T00:00:00.000Z');
const DAY = 86_400_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('demoUuid', () => {
  it('is deterministic and valid', () => {
    expect(demoUuid('A', 'person', 'asha')).toBe(demoUuid('A', 'person', 'asha'));
    expect(demoUuid('A', 'person', 'asha')).not.toBe(demoUuid('A', 'person', 'rohan'));
    expect(demoUuid('A', 'x')).toMatch(UUID_RE);
  });
});

describe('buildDemoDataset', () => {
  const a = buildDemoDataset('A', asOf);
  const personId = (name: string) => a.persons.find((p) => p.fullName.startsWith(name))!.id;
  const bookingsOf = (name: string) =>
    a.bookings.filter((b) => b.primaryContactPersonId === personId(name));
  const demandsOf = (name: string) =>
    a.demands.filter((d) => bookingsOf(name).some((b) => b.id === d.bookingId));

  it('has the project, towers and DEMO source for A', () => {
    expect(a.projects).toHaveLength(1);
    expect(a.projects[0]).toMatchObject({
      name: 'DEMO — Skyline Residency',
      city: 'Mumbai',
      state: 'Maharashtra',
      reraRegistrationNo: 'DEMO-P51800000001',
    });
    expect(a.towers.map((t) => t.name).sort()).toEqual(['A', 'B']);
    for (const row of [...a.projects, ...a.persons, ...a.bookings, ...a.demands, ...a.payments]) {
      expect(row.source).toBe('DEMO');
    }
  });

  it('has Asha, the cooperative hero', () => {
    const [booking] = bookingsOf('Asha');
    expect(booking).toMatchObject({ planType: 'CONSTRUCTION_LINKED', hasHomeLoan: false });
    expect(demandsOf('Asha')[0]).toMatchObject({ stageName: 'Slab 8', amountDue: '620000.00' });
    expect(demandsOf('Asha')[0]!.dueDate).toEqual(new Date(asOf.getTime() - 12 * DAY));
  });

  it('has the Mehtas, joint with a loan split', () => {
    const [booking] = bookingsOf('Vikram');
    expect(booking).toMatchObject({ hasHomeLoan: true, lenderName: 'DEMO Bank' });
    const roles = a.bookingApplicants.filter((x) => x.bookingId === booking!.id);
    expect(roles.map((r) => r.role).sort()).toEqual(['CO_APPLICANT', 'PRIMARY']);
    expect(
      a.persons.find((p) => p.id === roles.find((r) => r.role === 'CO_APPLICANT')!.personId)!
        .fullName,
    ).toMatch(/^Neha/);
    const [demand] = demandsOf('Vikram');
    expect(demand).toMatchObject({ amountDue: '620000.00', expectedBankAmount: '500000.00' });
    expect(a.payments.filter((p) => p.demandId === demand!.id)).toMatchObject([
      { payerType: 'BANK', amount: '500000.00' },
    ]);
  });

  it('has Rohan, loan with unknown split', () => {
    expect(bookingsOf('Rohan')[0]).toMatchObject({ hasHomeLoan: true });
    expect(demandsOf('Rohan')[0]!.expectedBankAmount).toBeNull();
  });

  it('has Priya, one combined case over two bookings', () => {
    expect(bookingsOf('Priya')).toHaveLength(2);
    expect(demandsOf('Priya')).toHaveLength(2);
    const cases = a.collectionCases.filter((c) => c.personId === personId('Priya'));
    expect(cases).toHaveLength(1);
    expect(a.caseDemands.filter((c) => c.caseId === cases[0]!.id)).toHaveLength(2);
  });

  it('has Anil, partially paid', () => {
    const [demand] = demandsOf('Anil');
    expect(demand).toMatchObject({ amountDue: '620000.00', status: 'PARTIALLY_PAID' });
    expect(a.payments.filter((p) => p.demandId === demand!.id)).toMatchObject([
      { payerType: 'BUYER', amount: '200000.00' },
    ]);
  });

  it('has Karan, two broken promises and a HIGH payment risk', () => {
    const promises = a.paymentPromises.filter((p) => p.personId === personId('Karan'));
    expect(promises).toHaveLength(2);
    expect(promises.every((p) => p.status === 'BROKEN')).toBe(true);
    expect(promises.every((p) => !('demandId' in p))).toBe(true);
    expect(
      a.riskScores.find((r) => r.personId === personId('Karan') && r.kind === 'PAYMENT'),
    ).toMatchObject({
      value: 75,
      band: 'HIGH',
    });
    const events = a.scoreEvents.filter((e) => e.personId === personId('Karan'));
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.reason === 'promise broken')).toBe(true);
  });

  it('has Suresh, hostile, escalated for contact risk above the skip threshold', () => {
    const suresh = personId('Suresh');
    const calls = a.callAttempts.filter((c) => c.personId === suresh);
    expect(calls.map((c) => c.hostility)).toEqual(expect.arrayContaining(['ABUSIVE', 'HIGH']));
    expect(calls).toHaveLength(2);
    const score = a.riskScores.find((r) => r.personId === suresh && r.kind === 'CONTACT')!;
    expect(score).toMatchObject({ value: 80, band: 'HIGH' });

    // Spec rules: start at 20; HIGH hostility +20; ABUSIVE +40. Each event follows the last.
    const ruleDelta = { HIGH: 20, ABUSIVE: 40 } as const;
    const events = a.scoreEvents
      .filter((e) => e.personId === suresh && e.kind === 'CONTACT')
      .sort((x, y) => new Date(x.createdAt!).getTime() - new Date(y.createdAt!).getTime());
    expect(events).toHaveLength(2);
    let value = 20;
    for (const e of events) {
      const call = calls.find((c) => c.id === e.callAttemptId)!;
      expect(e.delta).toBe(ruleDelta[call.hostility as 'HIGH' | 'ABUSIVE']);
      value += e.delta;
      expect(e.valueAfter).toBe(value);
    }
    expect(value).toBe(80);

    expect(a.collectionCases.find((c) => c.personId === suresh)).toMatchObject({
      status: 'ESCALATED',
      handledBy: 'HUMAN',
    });
    expect(a.escalations.filter((e) => e.personId === suresh)).toMatchObject([
      { reason: 'HIGH_CONTACT_RISK', status: 'OPEN', callAttemptId: events.at(-1)!.callAttemptId },
    ]);
  });

  it('dates cases, calls, promises and escalations by their scenario, not by now', () => {
    const time = (d: unknown) => new Date(d as Date).getTime();
    for (const c of a.collectionCases) {
      expect(c.createdAt, 'case createdAt').toBeInstanceOf(Date);
      expect(time(c.createdAt)).toBeLessThan(asOf.getTime());
      for (const call of a.callAttempts.filter((x) => x.caseId === c.id))
        expect(time(call.startedAt)).toBeGreaterThanOrEqual(time(c.createdAt));
    }
    for (const call of a.callAttempts) expect(call.createdAt).toEqual(call.startedAt);
    for (const p of a.paymentPromises) {
      const call = a.callAttempts.find((x) => x.id === p.callAttemptId)!;
      expect(p.createdAt).toEqual(call.startedAt);
    }
    for (const e of a.escalations) {
      const call = a.callAttempts.find((x) => x.id === e.callAttemptId)!;
      expect(e.createdAt).toEqual(call.endedAt);
    }
  });

  it('has Meera, an open dispute escalated to a human', () => {
    expect(a.escalations.find((e) => e.personId === personId('Meera'))).toMatchObject({
      reason: 'DISPUTE',
      status: 'OPEN',
    });
    expect(a.collectionCases.find((c) => c.personId === personId('Meera'))).toMatchObject({
      status: 'ESCALATED',
      handledBy: 'HUMAN',
    });
  });

  it('has the connection, policy, cadence, talking points and users', () => {
    expect(a.integrationConnections).toMatchObject([
      { source: 'DEMO', secretRef: 'demo-no-secret' },
    ]);
    expect(a.collectionPolicies).toHaveLength(1);
    expect(a.cadenceSteps.map((s) => [s.dayOffset, s.repeatEveryDays ?? null])).toEqual(
      expect.arrayContaining([
        [-3, null],
        [0, null],
        [5, 5],
      ]),
    );
    expect(a.approvedTalkingPoints.map((t) => [t.key, t.requiresHomeLoan]).sort()).toEqual([
      ['late-interest', false],
      ['loan-impact', true],
    ]);
    expect(a.users.map((u) => [u.email, u.role])).toEqual([
      ['demo-a1@example.test', 'ADMIN'],
      ['demo-a2@example.test', 'COLLECTIONS_LEAD'],
    ]);
  });

  it('has a small Builder B dataset', () => {
    const b = buildDemoDataset('B', asOf);
    expect(b.projects).toHaveLength(1);
    expect(b.persons).toHaveLength(2);
    expect(b.demands).toHaveLength(1);
    expect(b.collectionPolicies).toHaveLength(1);
    expect(b.cadenceSteps.length).toBeGreaterThan(0);
    expect(b.users.map((u) => [u.email, u.role])).toEqual([
      ['demo-b1@example.test', 'ADMIN'],
      ['demo-b2@example.test', 'COLLECTIONS_LEAD'],
    ]);
  });

  it('keeps amounts consistent', () => {
    const money = /^\d+\.\d{2}$/;
    for (const d of a.demands) {
      expect(d.amountDue).toMatch(money);
      if (d.expectedBankAmount != null) {
        expect(d.expectedBankAmount).toMatch(money);
        expect(Number(d.expectedBankAmount)).toBeLessThanOrEqual(Number(d.amountDue));
      }
      const paid = a.payments
        .filter((p) => p.demandId === d.id)
        .reduce((s, p) => s + Number(p.amount), 0);
      expect(paid).toBeLessThanOrEqual(Number(d.amountDue));
    }
    for (const p of a.payments) expect(p.amount).toMatch(money);
    for (const p of a.paymentPromises) expect(p.agreedAmount).toMatch(money);
  });

  it('references no other tenant', () => {
    const b = buildDemoDataset('B', asOf);
    const { tenant, ...rows } = b;
    expect(tenant.id).toBe(DEMO_TENANTS.B.id);
    for (const list of Object.values(rows)) {
      for (const row of list as { tenantId: string }[])
        expect(row.tenantId).toBe(DEMO_TENANTS.B.id);
    }
  });

  it('moves its dates with asOf', () => {
    const later = new Date(asOf.getTime() + 30 * DAY);
    const d = buildDemoDataset('A', later).demands.find((x) => x.stageName === 'Slab 8')!;
    expect(d.dueDate).toEqual(new Date(later.getTime() - 12 * DAY));
  });
});
