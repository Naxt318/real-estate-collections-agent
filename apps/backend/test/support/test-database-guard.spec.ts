import { assertTestDatabaseName } from './test-database-guard.js';

describe('assertTestDatabaseName', () => {
  it('accepts a database whose name ends in _test', () => {
    expect(() => assertTestDatabaseName('collections_test', 'TEST_DATABASE_URL')).not.toThrow();
  });

  it.each(['collections_dev', 'collections', 'test_collections', 'collections_test_old'])(
    'refuses %s and names only the variable',
    (name) => {
      expect(() => assertTestDatabaseName(name, 'TEST_MIGRATION_DATABASE_URL')).toThrow(
        /TEST_MIGRATION_DATABASE_URL must point at a database whose name ends in _test/,
      );
    },
  );
});
