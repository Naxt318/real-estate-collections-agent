import { validateEnv } from './env.schema.js';

const DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

describe('validateEnv', () => {
  it('applies defaults when only DATABASE_URL is set', () => {
    expect(validateEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      DATABASE_URL,
      ALLOW_DEV_TENANT_HEADER: false,
    });
  });

  it('parses PORT as a number', () => {
    expect(validateEnv({ DATABASE_URL, PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => validateEnv({ DATABASE_URL, PORT: 'abc' })).toThrow(/\n- PORT: /);
  });

  it('rejects a DATABASE_URL that is not postgresql://', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://x' })).toThrow(/\n- DATABASE_URL: /);
  });

  it.each([
    ['false', false],
    ['true', true],
  ])('reads ALLOW_DEV_TENANT_HEADER=%s as %s', (raw, expected) => {
    expect(
      validateEnv({ DATABASE_URL, ALLOW_DEV_TENANT_HEADER: raw }).ALLOW_DEV_TENANT_HEADER,
    ).toBe(expected);
  });

  it.each(['1', 'TRUE', 'yes', ''])('rejects ALLOW_DEV_TENANT_HEADER=%j', (raw) => {
    expect(() => validateEnv({ DATABASE_URL, ALLOW_DEV_TENANT_HEADER: raw })).toThrow(
      /\n- ALLOW_DEV_TENANT_HEADER: /,
    );
  });

  it('rejects ALLOW_DEV_TENANT_HEADER=true in production', () => {
    expect(() =>
      validateEnv({ DATABASE_URL, NODE_ENV: 'production', ALLOW_DEV_TENANT_HEADER: 'true' }),
    ).toThrow(/\n- ALLOW_DEV_TENANT_HEADER: must not be enabled in production/);
  });

  it('allows ALLOW_DEV_TENANT_HEADER=false in production', () => {
    expect(
      validateEnv({ DATABASE_URL, NODE_ENV: 'production', ALLOW_DEV_TENANT_HEADER: 'false' })
        .ALLOW_DEV_TENANT_HEADER,
    ).toBe(false);
  });

  it('never includes variable values in the error message', () => {
    const secret = 's3cr3t-pw';
    let message = '';
    try {
      validateEnv({ DATABASE_URL: `mysql://admin:${secret}@db.internal/app`, PORT: secret });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/- DATABASE_URL: /);
    expect(message).toMatch(/- PORT: /);
    expect(message).not.toContain(secret);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ DATABASE_URL, NODE_ENV: 'staging' })).toThrow(/\n- NODE_ENV: /);
  });

  it('rejects a missing DATABASE_URL with a formatted error', () => {
    expect(() => validateEnv({})).toThrow(
      /^Invalid environment configuration:[\s\S]*\n- DATABASE_URL: /,
    );
  });
});
