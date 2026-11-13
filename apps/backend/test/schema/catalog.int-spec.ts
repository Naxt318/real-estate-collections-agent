import { TenantContext } from '../../src/common/tenancy/tenant-context.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { TenantTransactionRunner } from '../../src/infrastructure/database/tenant-transaction-runner.js';
import { appClient, ownerClient, resetDb, seedTwoTenants } from '../support/db.js';

describe('catalog mirror: projects, towers, units', () => {
  let owner: PrismaClient;
  let ids: { a: string; b: string; suspended: string };

  const project = (tenantId: string, externalId: string) => ({
    tenantId,
    source: 'DEMO' as const,
    externalId,
    lastSyncedAt: new Date(),
    name: `Project ${externalId}`,
    city: 'Pune',
    state: 'Maharashtra',
  });

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

  it('re-sync upsert key is unique per tenant', async () => {
    await owner.project.create({ data: project(ids.a, 'P-1') });
    await expect(owner.project.create({ data: project(ids.a, 'P-1') })).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(owner.project.create({ data: project(ids.b, 'P-1') })).resolves.toBeTruthy();
  });

  it("unit cannot reference another tenant's project", async () => {
    const other = await owner.project.create({ data: project(ids.b, 'P-1') });
    await expect(
      owner.unit.create({
        data: {
          tenantId: ids.a,
          projectId: other.id,
          source: 'DEMO',
          externalId: 'U-1',
          lastSyncedAt: new Date(),
          unitNumber: '101',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('unit without a tower is allowed', async () => {
    const p = await owner.project.create({ data: project(ids.a, 'P-1') });
    const unit = await owner.unit.create({
      data: {
        tenantId: ids.a,
        projectId: p.id,
        towerId: null,
        source: 'DEMO',
        externalId: 'U-1',
        lastSyncedAt: new Date(),
        unitNumber: '101',
        carpetAreaSqft: '645.50',
      },
    });
    expect(unit.towerId).toBeNull();
    expect(unit.carpetAreaSqft?.toString()).toBe('645.5');
  });

  it("app user sees only its tenant's projects", async () => {
    const pa = await owner.project.create({ data: project(ids.a, 'P-1') });
    await owner.project.create({ data: project(ids.b, 'P-1') });
    const app = appClient();
    try {
      const runner = new TenantTransactionRunner(app, new TenantContext());
      const rows = await runner.runAs(ids.a, (tx) => tx.project.findMany());
      expect(rows.map((r) => r.id)).toEqual([pa.id]);
    } finally {
      await app.$disconnect();
    }
  });
});
