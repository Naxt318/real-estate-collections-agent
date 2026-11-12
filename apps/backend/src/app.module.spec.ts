import { Test } from '@nestjs/testing';

describe('AppModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('provides PrismaService to the whole app', async () => {
    // AppConfigModule validates process.env on import, so stub it before importing AppModule.
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@127.0.0.1:1/db');
    vi.resetModules();
    const { PrismaService } = await import('./infrastructure/database/prisma.service.js');
    const { AppModule } = await import('./app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    // get() throws when the provider is missing. PrismaClient returns a proxy, so instanceof is unreliable.
    expect(() => moduleRef.get(PrismaService)).not.toThrow();
    await moduleRef.close();
  });
});
