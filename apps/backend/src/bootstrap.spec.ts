import { Body, Controller, Get, INestApplication, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from './bootstrap.js';

class EchoDto {
  @IsString()
  name: string;
}

@Controller('probe')
class ProbeController {
  @Get()
  get(): string {
    return 'ok';
  }

  @Post()
  echo(@Body() body: EchoDto): { isDto: boolean; body: EchoDto } {
    return { isDto: body instanceof EchoDto, body };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('configureApp', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves routes under /api/v1', async () => {
    await request(app.getHttpServer()).get('/api/v1/probe').expect(200, 'ok');
  });

  it('does not serve routes without the /api/v1 prefix', async () => {
    await request(app.getHttpServer()).get('/probe').expect(404);
    await request(app.getHttpServer()).get('/api/probe').expect(404);
  });

  it('rejects request bodies with properties the DTO does not declare', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'a', tenantId: 'x' })
      .expect(400);
  });

  it('rejects request bodies that fail validation', async () => {
    await request(app.getHttpServer()).post('/api/v1/probe').send({ name: 42 }).expect(400);
  });

  it('transforms valid request bodies into DTO instances', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'a' })
      .expect(201);
    expect(res.body).toEqual({ isDto: true, body: { name: 'a' } });
  });

  it('listens for shutdown signals so the app closes cleanly', async () => {
    await app.close();
    const before = process.listenerCount('SIGTERM');

    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    expect(process.listenerCount('SIGTERM')).toBe(before + 1);
  });
});
