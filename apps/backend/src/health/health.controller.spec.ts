import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../configure-app.js';
import { HealthModule } from './health.module.js';

describe('health endpoints', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [HealthModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // Cloud Run's liveness probe: the process is up. It must not depend on the
  // database or a tenant, or a database outage would restart healthy containers.
  it('GET /api/v1/health/live answers 200 with status ok and no tenant or database', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
