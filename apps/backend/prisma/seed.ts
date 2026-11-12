import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Clearly labelled demo data (CLAUDE.md §8), safe to run repeatedly.
// Runs as app_owner, a superuser, so RLS does not apply here.
const DEMO_TENANTS = [
  { id: '00000000-0000-4000-8000-00000000000a', name: 'DEMO — Builder A', emailPrefix: 'demo-a' },
  { id: '00000000-0000-4000-8000-00000000000b', name: 'DEMO — Builder B', emailPrefix: 'demo-b' },
];
const USERS_PER_TENANT = 2;

const connectionString = process.env.MIGRATION_DATABASE_URL;
if (!connectionString) throw new Error('MIGRATION_DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  for (const { id, name, emailPrefix } of DEMO_TENANTS) {
    await prisma.tenant.upsert({ where: { id }, update: { name }, create: { id, name } });
    for (let n = 1; n <= USERS_PER_TENANT; n++) {
      const email = `${emailPrefix}${n}@example.test`;
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: id, email } },
        update: {},
        create: { tenantId: id, email, name: `Demo user ${n}` },
      });
    }
    console.log(`Seeded ${name}: ${id}`);
  }
} finally {
  await prisma.$disconnect();
}
