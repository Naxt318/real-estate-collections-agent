import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Runs once before the integration suites: points the app at the test database and migrates it as app_owner.
export default function setup(): void {
  if (existsSync('.env')) process.loadEnvFile('.env');

  const testUrl = process.env.TEST_DATABASE_URL;
  const testMigrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  if (!testUrl || !testMigrationUrl) {
    throw new Error(
      'TEST_DATABASE_URL and TEST_MIGRATION_DATABASE_URL must be set for integration tests',
    );
  }
  // resetDb truncates every table: refuse to run if the test URLs point at the dev database.
  if (
    testUrl === process.env.DATABASE_URL ||
    testMigrationUrl === process.env.MIGRATION_DATABASE_URL
  ) {
    throw new Error(
      'TEST_DATABASE_URL must differ from DATABASE_URL, and TEST_MIGRATION_DATABASE_URL from MIGRATION_DATABASE_URL',
    );
  }
  process.env.DATABASE_URL = testUrl;

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, MIGRATION_DATABASE_URL: testMigrationUrl },
    stdio: 'inherit',
  });
}
