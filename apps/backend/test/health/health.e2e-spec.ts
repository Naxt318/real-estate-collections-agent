import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Full AppModule against the test database (global setup points DATABASE_URL at it).
describe('health and error responses (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import('../../src/app.module.js');
    const { configureApp } = await import('../../src/configure-app.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health/live answers 200 with no tenant header', async () => {
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
  });

  it('GET /api/v1/health/ready answers 200 when the database is up', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });

  it('an unknown route answers 404 with exactly the standard error keys', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);

    expect(Object.keys(res.body).sort()).toEqual(
      ['error', 'message', 'path', 'statusCode', 'timestamp'].sort(),
    );
    expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found', path: '/api/v1/nope' });
  });
});
