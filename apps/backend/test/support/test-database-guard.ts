import pg from 'pg';

// resetDb truncates every table, so integration tests must never reach a non-test database.
// Checking the connected database itself catches URLs that differ only in host spelling or params.
export function assertTestDatabaseName(name: string, variable: string): void {
  if (!name.endsWith('_test')) {
    throw new Error(`${variable} must point at a database whose name ends in _test`);
  }
}

export async function assertConnectsToTestDatabase(url: string, variable: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ db: string }>('SELECT current_database() AS db');
    assertTestDatabaseName(rows[0]?.db ?? '', variable);
  } finally {
    await client.end();
  }
}
