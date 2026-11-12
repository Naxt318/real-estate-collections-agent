import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma CLI commands run as app_owner (MIGRATION_DATABASE_URL); the app itself connects as app_user.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Optional so `prisma generate` works in CI without a .env; migrate commands fail if it is unset.
    url: process.env.MIGRATION_DATABASE_URL,
  },
});
