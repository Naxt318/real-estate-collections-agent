import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Nothing listens on port 1, so the readiness ping fails fast instead of timing out.
const UNREACHABLE_DATABASE_URL = 'postgresql://u:p@127.0.0.1:1/db';

describe('health endpoints with the database down', () => {
  let app: INestApplication<App>;

  // config.module validates process.env when imported, so stub it and import fresh copies.
  beforeEach(async () => {
    vi.stubEnv('DATABASE_URL', UNREACHABLE_DATABASE_URL);
    vi.resetModules();
    const { AppConfigModule } = await import('../config/config.module.js');
    const { DatabaseModule } = await import('../infrastructure/database/database.module.js');
    const { TenancyModule } = await import('../common/tenancy/tenancy.module.js');
    const { HealthModule } = await import('./health.module.js');
    const { configureApp } = await import('../configure-app.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, TenancyModule, DatabaseModule, HealthModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  // Cloud Run's liveness probe: the process is up. It must not depend on the
  // database or a tenant, or a database outage would restart healthy containers.
  it('GET /api/v1/health/live answers 200 with status ok and no tenant', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

    expect(res.body).toMatchObject({ status: 'ok' });
  });

  // Readiness takes the instance out of rotation while the database is unreachable.
  it('GET /api/v1/health/ready answers 503 in the standard error shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);

    expect(Object.keys(res.body).sort()).toEqual(
      ['error', 'message', 'path', 'statusCode', 'timestamp'].sort(),
    );
    expect(res.body).toMatchObject({ statusCode: 503, path: '/api/v1/health/ready' });
  });
});
