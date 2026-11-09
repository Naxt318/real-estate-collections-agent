import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('returns API_BASE_URL when it is a valid URL', () => {
    expect(parseEnv({ API_BASE_URL: 'http://localhost:3001' })).toEqual({
      API_BASE_URL: 'http://localhost:3001',
    });
  });

  it('rejects a missing API_BASE_URL and names the variable', () => {
    expect(() => parseEnv({})).toThrow(/API_BASE_URL/);
  });

  it('rejects an API_BASE_URL that is not a URL and names the variable', () => {
    expect(() => parseEnv({ API_BASE_URL: 'nope' })).toThrow(/API_BASE_URL/);
  });

  it('ignores unrelated variables', () => {
    expect(parseEnv({ API_BASE_URL: 'http://localhost:3001', OTHER: 'x' })).toEqual({
      API_BASE_URL: 'http://localhost:3001',
    });
  });
});
