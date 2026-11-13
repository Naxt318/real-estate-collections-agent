import type { Prisma } from '../../src/generated/prisma/client.js';
import { DEMO_TENANTS, demoUuid, type DemoTenantKey } from './demo-ids.js';

type WithId<T> = T & { id: string };
type Row<T> = WithId<T>;

export interface DemoDataset {
  tenant: { id: string; name: string };
  users: Row<Prisma.UserUncheckedCreateInput & { email: string }>[];
  integrationConnections: Row<Prisma.IntegrationConnectionUncheckedCreateInput>[];
  collectionPolicies: Row<Prisma.CollectionPolicyUncheckedCreateInput>[];
  cadenceSteps: Row<Prisma.CadenceStepUncheckedCreateInput>[];
  approvedTalkingPoints: Row<Prisma.ApprovedTalkingPointUncheckedCreateInput>[];
  projects: Row<Prisma.ProjectUncheckedCreateInput>[];
  towers: Row<Prisma.TowerUncheckedCreateInput>[];
  units: Row<Prisma.UnitUncheckedCreateInput>[];
  persons: Row<Prisma.PersonUncheckedCreateInput>[];
  bookings: Row<Prisma.BookingUncheckedCreateInput>[];
  bookingApplicants: Row<Prisma.BookingApplicantUncheckedCreateInput>[];
  demands: Row<Prisma.DemandUncheckedCreateInput>[];
  payments: Row<Prisma.PaymentUncheckedCreateInput>[];
  collectionCases: Row<Prisma.CollectionCaseUncheckedCreateInput>[];
  caseDemands: Row<Prisma.CaseDemandUncheckedCreateInput>[];
  callAttempts: Row<Prisma.CallAttemptUncheckedCreateInput>[];
  paymentPromises: Row<Prisma.PaymentPromiseUncheckedCreateInput>[];
  escalations: Row<Prisma.EscalationUncheckedCreateInput>[];
  riskScores: Row<Prisma.RiskScoreUncheckedCreateInput>[];
  scoreEvents: Row<Prisma.ScoreEventUncheckedCreateInput>[];
}

const DAY = 86_400_000;
const SLAB_AMOUNT = '620000.00';

interface BuyerSpec {
  key: string;
  name: string;
  phone: string;
  unit: string;
  tower: 'A' | 'B';
  hasHomeLoan?: boolean;
  lender?: string;
  coApplicant?: { key: string; name: string; phone: string };
  demand: {
    stage: string;
    sequence: number;
    dueDaysAgo: number;
    expectedBankAmount?: string | null;
    status?: 'RAISED' | 'PARTIALLY_PAID';
  };
}

function emptyDataset(tenant: { id: string; name: string }): DemoDataset {
  return {
    tenant: { id: tenant.id, name: tenant.name },
    users: [],
    integrationConnections: [],
    collectionPolicies: [],
    cadenceSteps: [],
    approvedTalkingPoints: [],
    projects: [],
    towers: [],
    units: [],
    persons: [],
    bookings: [],
    bookingApplicants: [],
    demands: [],
    payments: [],
    collectionCases: [],
    caseDemands: [],
    callAttempts: [],
    paymentPromises: [],
    escalations: [],
    riskScores: [],
    scoreEvents: [],
  };
}

export function buildDemoDataset(key: DemoTenantKey, asOf: Date): DemoDataset {
  const tenant = DEMO_TENANTS[key];
  const tenantId = tenant.id;
  const ds = emptyDataset(tenant);
  const id = (...parts: string[]) => demoUuid(key, ...parts);
  const daysAgo = (n: number) => new Date(asOf.getTime() - n * DAY);
  const base = { tenantId, source: 'DEMO' as const, lastSyncedAt: asOf };

  // Users, with the same email scheme the seed has always used.
  const roles = ['ADMIN', 'COLLECTIONS_LEAD'] as const;
  roles.forEach((role, i) => {
    const email = `${tenant.emailPrefix}${i + 1}@example.test`;
    ds.users.push({ id: id('user', email), tenantId, email, name: `Demo user ${i + 1}`, role });
  });

  ds.collectionPolicies.push({ id: id('policy'), tenantId });
  const steps: [number, number | null][] = [
    [-3, null],
    [0, null],
    [5, 5],
  ];
  for (const [dayOffset, repeatEveryDays] of steps) {
    ds.cadenceSteps.push({
      id: id('cadence', String(dayOffset)),
      tenantId,
      dayOffset,
      repeatEveryDays,
    });
  }

  const projectId = id('project');
  ds.projects.push({
    ...base,
    id: projectId,
    externalId: 'DEMO-PRJ-1',
    name: key === 'A' ? 'DEMO — Skyline Residency' : 'DEMO — Lakeview Heights',
    city: key === 'A' ? 'Mumbai' : 'Pune',
    state: 'Maharashtra',
    reraRegistrationNo: key === 'A' ? 'DEMO-P51800000001' : 'DEMO-P52100000002',
  });
  const towerIds = new Map<string, string>();
  for (const name of key === 'A' ? ['A', 'B'] : ['A']) {
    const towerId = id('tower', name);
    towerIds.set(name, towerId);
    ds.towers.push({ ...base, id: towerId, externalId: `DEMO-TWR-${name}`, projectId, name });
  }

  const addPerson = (pkey: string, fullName: string, phone: string) => {
    const personId = id('person', pkey);
    ds.persons.push({
      ...base,
      id: personId,
      externalId: `DEMO-PER-${pkey}`,
      fullName,
      primaryPhone: phone,
      email: `${pkey}@example.test`,
      preferredLanguage: 'en',
    });
    return personId;
  };

  // One booking with its unit and applicants. A demand is added separately.
  const addBooking = (
    bkey: string,
    personId: string,
    unitNumber: string,
    tower: string,
    opts: { hasHomeLoan?: boolean; lender?: string; coApplicantId?: string } = {},
  ) => {
    const unitId = id('unit', bkey);
    ds.units.push({
      ...base,
      id: unitId,
      externalId: `DEMO-UNIT-${bkey}`,
      projectId,
      towerId: towerIds.get(tower)!,
      unitNumber,
      floor: Number(unitNumber.slice(0, -2)) || null,
    });
    const bookingId = id('booking', bkey);
    ds.bookings.push({
      ...base,
      id: bookingId,
      externalId: `DEMO-BKG-${bkey}`,
      unitId,
      planType: 'CONSTRUCTION_LINKED',
      status: 'ACTIVE',
      bookingDate: daysAgo(400),
      agreementDate: daysAgo(380),
      agreementValue: '9500000.00',
      hasHomeLoan: opts.hasHomeLoan ?? false,
      lenderName: opts.lender ?? null,
      primaryContactPersonId: personId,
    });
    ds.bookingApplicants.push({
      id: id('applicant', bkey, 'primary'),
      tenantId,
      bookingId,
      personId,
      role: 'PRIMARY',
      callOrder: 1,
    });
    if (opts.coApplicantId) {
      ds.bookingApplicants.push({
        id: id('applicant', bkey, 'co'),
        tenantId,
        bookingId,
        personId: opts.coApplicantId,
        role: 'CO_APPLICANT',
        callOrder: 2,
      });
    }
    return bookingId;
  };

  const addDemand = (
    dkey: string,
    bookingId: string,
    d: BuyerSpec['demand'],
    amountDue = SLAB_AMOUNT,
  ) => {
    const demandId = id('demand', dkey);
    ds.demands.push({
      ...base,
      id: demandId,
      externalId: `DEMO-DMD-${dkey}`,
      bookingId,
      stageName: d.stage,
      stageSequence: d.sequence,
      demandDate: daysAgo(d.dueDaysAgo + 15),
      dueDate: daysAgo(d.dueDaysAgo),
      amountDue,
      expectedBankAmount: d.expectedBankAmount ?? null,
      status: d.status ?? 'RAISED',
    });
    return demandId;
  };

  const addPayment = (
    pkey: string,
    bookingId: string,
    demandId: string,
    amount: string,
    payerType: 'BUYER' | 'BANK',
    ago: number,
  ) => {
    ds.payments.push({
      ...base,
      id: id('payment', pkey),
      externalId: `DEMO-PAY-${pkey}`,
      bookingId,
      demandId,
      amount,
      paidAt: daysAgo(ago),
      payerType,
      reference: `DEMO-REF-${pkey}`,
    });
  };

  // One open case per person, covering all of that person's due demands.
  const addCase = (
    personId: string,
    demandIds: string[],
    status: 'OPEN' | 'ESCALATED' = 'OPEN',
    handledBy: 'AI' | 'HUMAN' = 'AI',
  ) => {
    const caseId = id('case', personId);
    ds.collectionCases.push({ id: caseId, tenantId, personId, status, handledBy });
    demandIds.forEach((demandId, i) =>
      ds.caseDemands.push({ id: id('case-demand', caseId, String(i)), tenantId, caseId, demandId }),
    );
    return caseId;
  };

  const addCall = (
    ckey: string,
    caseId: string,
    personId: string,
    ago: number,
    outcome: Prisma.CallAttemptUncheckedCreateInput['outcome'],
    hostility: 'NONE' | 'ABUSIVE' = 'NONE',
    summary?: string,
  ) => {
    const callId = id('call', ckey);
    ds.callAttempts.push({
      id: callId,
      tenantId,
      caseId,
      personId,
      startedAt: daysAgo(ago),
      endedAt: new Date(daysAgo(ago).getTime() + 90_000),
      durationSec: 90,
      connected: true,
      outcome,
      hostility,
      summary: summary ?? null,
    });
    return callId;
  };

  const setScore = (
    personId: string,
    kind: 'CONTACT' | 'PAYMENT',
    value: number,
    band: 'LOW' | 'MEDIUM' | 'HIGH',
    events: {
      delta: number;
      valueAfter: number;
      reason: string;
      callAttemptId: string;
      ago: number;
    }[],
  ) => {
    ds.riskScores.push({ id: id('risk', personId, kind), tenantId, personId, kind, value, band });
    events.forEach((e, i) =>
      ds.scoreEvents.push({
        id: id('score-event', personId, kind, String(i)),
        tenantId,
        personId,
        kind,
        delta: e.delta,
        valueAfter: e.valueAfter,
        reason: e.reason,
        source: 'RULE',
        callAttemptId: e.callAttemptId,
        createdAt: daysAgo(e.ago),
      }),
    );
  };

  if (key === 'B') {
    const p1 = addPerson('b-buyer-1', 'Divya Menon', '+919000000101');
    addPerson('b-buyer-2', 'Harish Patel', '+919000000102');
    const booking = addBooking('b1', p1, '301', 'A');
    const demand = addDemand('b1', booking, { stage: 'Slab 3', sequence: 3, dueDaysAgo: 9 });
    addCase(p1, [demand]);
    return ds;
  }

  ds.integrationConnections.push({
    id: id('connection'),
    tenantId,
    source: 'DEMO',
    secretRef: 'demo-no-secret',
    lastSuccessAt: asOf,
  });
  ds.approvedTalkingPoints.push(
    {
      id: id('talking-point', 'late-interest'),
      tenantId,
      key: 'late-interest',
      text: 'Delayed instalments may attract late-payment interest as set out in your Agreement for Sale.',
      requiresHomeLoan: false,
    },
    {
      id: id('talking-point', 'loan-impact'),
      tenantId,
      key: 'loan-impact',
      text: 'If your bank has not yet released its share, please check the disbursement status with your lender.',
      requiresHomeLoan: true,
    },
  );

  const simple: BuyerSpec[] = [
    {
      key: 'asha',
      name: 'Asha Rao',
      phone: '+919000000001',
      unit: '801',
      tower: 'A',
      demand: { stage: 'Slab 8', sequence: 8, dueDaysAgo: 12 },
    },
    {
      key: 'vikram',
      name: 'Vikram Mehta',
      phone: '+919000000002',
      unit: '1202',
      tower: 'A',
      hasHomeLoan: true,
      lender: 'DEMO Bank',
      coApplicant: { key: 'neha', name: 'Neha Mehta', phone: '+919000000003' },
      demand: {
        stage: 'Slab 8',
        sequence: 8,
        dueDaysAgo: 20,
        expectedBankAmount: '500000.00',
        status: 'PARTIALLY_PAID',
      },
    },
    {
      key: 'rohan',
      name: 'Rohan Das',
      phone: '+919000000004',
      unit: '604',
      tower: 'B',
      hasHomeLoan: true,
      lender: 'DEMO Bank',
      demand: { stage: 'Slab 8', sequence: 8, dueDaysAgo: 15, expectedBankAmount: null },
    },
    {
      key: 'anil',
      name: 'Anil Kapoor',
      phone: '+919000000006',
      unit: '905',
      tower: 'A',
      demand: { stage: 'Slab 8', sequence: 8, dueDaysAgo: 25, status: 'PARTIALLY_PAID' },
    },
    {
      key: 'karan',
      name: 'Karan Singh',
      phone: '+919000000007',
      unit: '402',
      tower: 'B',
      demand: { stage: 'Slab 6', sequence: 6, dueDaysAgo: 45 },
    },
    {
      key: 'suresh',
      name: 'Suresh Iyer',
      phone: '+919000000008',
      unit: '703',
      tower: 'B',
      demand: { stage: 'Slab 7', sequence: 7, dueDaysAgo: 30 },
    },
    {
      key: 'meera',
      name: 'Meera Joshi',
      phone: '+919000000009',
      unit: '1101',
      tower: 'A',
      demand: { stage: 'Slab 8', sequence: 8, dueDaysAgo: 18 },
    },
  ];

  const personIds: Record<string, string> = {};
  const demandIds: Record<string, string> = {};
  for (const s of simple) {
    const personId = addPerson(s.key, s.name, s.phone);
    personIds[s.key] = personId;
    const coApplicantId = s.coApplicant
      ? addPerson(s.coApplicant.key, s.coApplicant.name, s.coApplicant.phone)
      : undefined;
    const bookingId = addBooking(s.key, personId, s.unit, s.tower, {
      hasHomeLoan: s.hasHomeLoan,
      lender: s.lender,
      coApplicantId,
    });
    const demandId = addDemand(s.key, bookingId, s.demand);
    demandIds[s.key] = demandId;
    if (s.key === 'vikram') addPayment('vikram-bank', bookingId, demandId, '500000.00', 'BANK', 10);
    if (s.key === 'anil') addPayment('anil-buyer', bookingId, demandId, '200000.00', 'BUYER', 8);
  }

  // Priya: two bookings, two overdue demands, one combined case.
  const priya = addPerson('priya', 'Priya Nair', '+919000000005');
  const priyaBooking1 = addBooking('priya-1', priya, '502', 'A');
  const priyaBooking2 = addBooking('priya-2', priya, '1503', 'B');
  const priyaDemands = [
    addDemand('priya-1', priyaBooking1, { stage: 'Slab 8', sequence: 8, dueDaysAgo: 14 }),
    addDemand(
      'priya-2',
      priyaBooking2,
      { stage: 'Slab 5', sequence: 5, dueDaysAgo: 22 },
      '480000.00',
    ),
  ];
  addCase(priya, priyaDemands);

  for (const s of simple) {
    const personId = personIds[s.key]!;
    const demandId = demandIds[s.key]!;
    if (s.key === 'meera') {
      const caseId = addCase(personId, [demandId], 'ESCALATED', 'HUMAN');
      const callId = addCall(
        'meera-1',
        caseId,
        personId,
        4,
        'DISPUTE',
        'NONE',
        'Buyer disputes the Slab 8 amount.',
      );
      ds.escalations.push({
        id: id('escalation', 'meera'),
        tenantId,
        caseId,
        personId,
        callAttemptId: callId,
        reason: 'DISPUTE',
        status: 'OPEN',
      });
      continue;
    }
    const caseId = addCase(personId, [demandId]);
    if (s.key === 'karan') {
      const promiseDays = [30, 15];
      const calls = promiseDays.map((ago, i) =>
        addCall(
          `karan-${i + 1}`,
          caseId,
          personId,
          ago + 3,
          'PROMISED',
          'NONE',
          'Promised to pay.',
        ),
      );
      calls.forEach((callId, i) =>
        ds.paymentPromises.push({
          id: id('promise', 'karan', String(i)),
          tenantId,
          caseId,
          personId,
          callAttemptId: callId,
          proposedDate: daysAgo(promiseDays[i]! + 3),
          agreedDate: daysAgo(promiseDays[i]!),
          agreedAmount: SLAB_AMOUNT,
          status: 'BROKEN',
          resolvedAt: daysAgo(promiseDays[i]! - 1),
        }),
      );
      setScore(personId, 'PAYMENT', 75, 'HIGH', [
        {
          delta: 25,
          valueAfter: 50,
          reason: 'promise broken',
          callAttemptId: calls[0]!,
          ago: promiseDays[0]! - 1,
        },
        {
          delta: 25,
          valueAfter: 75,
          reason: 'promise broken',
          callAttemptId: calls[1]!,
          ago: promiseDays[1]! - 1,
        },
      ]);
    }
    if (s.key === 'suresh') {
      const callId = addCall(
        'suresh-1',
        caseId,
        personId,
        5,
        'ABUSIVE',
        'ABUSIVE',
        'Caller was abusive; call ended.',
      );
      setScore(personId, 'CONTACT', 80, 'HIGH', [
        { delta: 80, valueAfter: 80, reason: 'abusive call', callAttemptId: callId, ago: 5 },
      ]);
    }
  }

  return ds;
}
