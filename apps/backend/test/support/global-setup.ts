import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { assertConnectsToTestDatabase } from './test-database-guard.js';

// Runs once before the integration suites: points the app at the test database and migrates it as app_owner.
export default async function setup(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');

  const testUrl = process.env.TEST_DATABASE_URL;
  const testMigrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  if (!testUrl || !testMigrationUrl) {
    throw new Error(
      'TEST_DATABASE_URL and TEST_MIGRATION_DATABASE_URL must be set for integration tests',
    );
  }
  await assertConnectsToTestDatabase(testUrl, 'TEST_DATABASE_URL');
  await assertConnectsToTestDatabase(testMigrationUrl, 'TEST_MIGRATION_DATABASE_URL');
  process.env.DATABASE_URL = testUrl;

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, MIGRATION_DATABASE_URL: testMigrationUrl },
    stdio: 'inherit',
  });
}
