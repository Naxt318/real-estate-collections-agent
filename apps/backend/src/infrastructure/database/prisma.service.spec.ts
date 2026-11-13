import { Test } from '@nestjs/testing';

// Nothing listens on port 1, so a query fails fast instead of waiting for a timeout.
const UNREACHABLE_DATABASE_URL = 'postgresql://u:p@127.0.0.1:1/db';

// config.module validates process.env when imported, so stub it and import fresh copies.
async function compileWithUnreachableDatabase() {
  vi.stubEnv('DATABASE_URL', UNREACHABLE_DATABASE_URL);
  vi.resetModules();
  const { PrismaService } = await import('./prisma.service.js');
  const { AppConfigModule } = await import('../../config/config.module.js');
  const { DatabaseModule } = await import('./database.module.js');
  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule, DatabaseModule],
  }).compile();
  return { moduleRef, prisma: moduleRef.get(PrismaService) };
}

describe('PrismaService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does not connect while the app starts', async () => {
    const { moduleRef, prisma } = await compileWithUnreachableDatabase();
    const connect = vi.spyOn(prisma, '$connect');

    await moduleRef.init();

    expect(connect).not.toHaveBeenCalled();
    await moduleRef.close();
  });

  it('starts with the database down and fails only when queried', async () => {
    const { moduleRef, prisma } = await compileWithUnreachableDatabase();

    await expect(moduleRef.init()).resolves.toBe(moduleRef);
    await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow();

    await moduleRef.close();
  });

  it('disconnects when the app shuts down', async () => {
    const { moduleRef, prisma } = await compileWithUnreachableDatabase();
    const disconnect = vi.spyOn(prisma, '$disconnect');
    await moduleRef.init();

    await moduleRef.close();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
