import { Test } from '@nestjs/testing';

// ConfigModule.forRoot reads and validates process.env when config.module is imported,
// so each test stubs the environment first and then imports a fresh copy of the module.
async function compileWithEnv(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  // Import the service first: Nest must start compiling straight after config.module loads,
  // or its rejected forRoot() promise is reported as unhandled before Nest awaits it.
  const { AppConfigService } = await import('./app-config.service.js');
  const { AppConfigModule } = await import('./config.module.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule] }).compile();
  return moduleRef.get(AppConfigService);
}

describe('AppConfigModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes validated, typed values through AppConfigService', async () => {
    const config = await compileWithEnv({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      PORT: '4100',
      ALLOW_DEV_TENANT_HEADER: 'false',
    });

    expect(config.get('PORT')).toBe(4100);
    expect(config.get('ALLOW_DEV_TENANT_HEADER')).toBe(false);
  });

  it('refuses to start when the environment is invalid', async () => {
    await expect(compileWithEnv({ DATABASE_URL: '' })).rejects.toThrow(
      /Invalid environment configuration:[\s\S]*- DATABASE_URL: /,
    );
  });
});
