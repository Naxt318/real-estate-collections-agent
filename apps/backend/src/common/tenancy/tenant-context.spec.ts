import { TenantContext } from './tenant-context.js';
import { TenantContextMissingError } from './tenancy.errors.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('TenantContext', () => {
  const ctx = new TenantContext();

  it('has no tenant outside run', () => {
    expect(ctx.getTenantId()).toBeUndefined();
  });

  it('exposes the tenant inside run, including after await', async () => {
    await ctx.run('t1', async () => {
      expect(ctx.getTenantId()).toBe('t1');
      await sleep(1);
      expect(ctx.getTenantId()).toBe('t1');
    });
  });

  it('restores the outer tenant when a nested run returns', () => {
    ctx.run('outer', () => {
      ctx.run('inner', () => expect(ctx.getTenantId()).toBe('inner'));
      expect(ctx.getTenantId()).toBe('outer');
    });
  });

  it('requireTenantId throws outside run', () => {
    expect(() => ctx.requireTenantId()).toThrow(TenantContextMissingError);
  });

  it('requireTenantId returns the id inside run', () => {
    expect(ctx.run('t1', () => ctx.requireTenantId())).toBe('t1');
  });

  it('keeps concurrent runs isolated', async () => {
    const seen = async (id: string, delay: number) =>
      ctx.run(id, async () => {
        await sleep(delay);
        return ctx.getTenantId();
      });
    expect(await Promise.all([seen('a', 10), seen('b', 1)])).toEqual(['a', 'b']);
  });
});
