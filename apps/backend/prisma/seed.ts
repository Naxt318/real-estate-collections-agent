import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { applyDemoDataset } from './seed/apply-demo-dataset.js';
import { buildDemoDataset } from './seed/demo-dataset.js';
import { DEMO_TENANTS, type DemoTenantKey } from './seed/demo-ids.js';

// Clearly labelled demo data (CLAUDE.md §8), safe to run repeatedly.
// Runs as app_owner, a superuser, so RLS does not apply here.
const connectionString = process.env.MIGRATION_DATABASE_URL;
if (!connectionString) throw new Error('MIGRATION_DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  for (const key of Object.keys(DEMO_TENANTS) as DemoTenantKey[]) {
    await applyDemoDataset(prisma, buildDemoDataset(key, new Date()));
    console.log(`Seeded ${DEMO_TENANTS[key].name}: ${DEMO_TENANTS[key].id}`);
  }
} finally {
  await prisma.$disconnect();
}
