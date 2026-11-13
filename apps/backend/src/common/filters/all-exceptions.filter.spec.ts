import {
  Body,
  Controller,
  Get,
  HttpException,
  INestApplication,
  Logger,
  Module,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsEmail } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../../configure-app.js';

class SignupDto {
  @IsEmail()
  email: string;
}

@Controller('probe')
class ProbeController {
  @Get('missing')
  missing(): never {
    throw new NotFoundException();
  }

  @Get('teapot')
  teapot(): never {
    throw new HttpException({ message: 'short and stout', error: 'Teapot', extra: 'x' }, 418);
  }

  @Get('plain-text')
  plainText(): never {
    throw new HttpException('slow down', 429);
  }

  @Get('crash')
  crash(): never {
    throw new Error('db password=secret');
  }

  @Post('signup')
  signup(@Body() body: SignupDto): SignupDto {
    return body;
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

const ERROR_BODY_KEYS = ['error', 'message', 'path', 'statusCode', 'timestamp'];

describe('AllExceptionsFilter (registered by configureApp)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('returns validation messages as an array with status 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe/signup')
      .send({ email: 'nope' })
      .expect(400);

    expect(Object.keys(res.body).sort()).toEqual(ERROR_BODY_KEYS);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: ['email must be an email'],
      path: '/api/v1/probe/signup',
    });
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('gives a thrown NotFoundException the standard shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/missing').expect(404);

    expect(Object.keys(res.body).sort()).toEqual(ERROR_BODY_KEYS);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found', message: 'Not Found' });
  });

  it('gives unknown routes the standard shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);

    expect(Object.keys(res.body).sort()).toEqual(ERROR_BODY_KEYS);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found', path: '/api/v1/nope' });
  });

  it('keeps the status, error and message of a custom HttpException and drops other fields', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/teapot').expect(418);

    expect(Object.keys(res.body).sort()).toEqual(ERROR_BODY_KEYS);
    expect(res.body).toMatchObject({
      statusCode: 418,
      error: 'Teapot',
      message: 'short and stout',
    });
  });

  it('uses the standard reason phrase when an HttpException has a plain string response', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/plain-text').expect(429);

    expect(res.body).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'slow down',
    });
  });

  it('hides unexpected errors behind a generic 500', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const res = await request(app.getHttpServer()).get('/api/v1/probe/crash').expect(500);

    expect(Object.keys(res.body).sort()).toEqual(ERROR_BODY_KEYS);
    expect(res.body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    expect(res.text).not.toContain('secret');
    expect(res.text).not.toContain('at ');
  });

  it('logs unexpected errors with their stack on the server', async () => {
    const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await request(app.getHttpServer()).get('/api/v1/probe/crash').expect(500);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/v1/probe/crash'),
      expect.stringContaining('Error: db password=secret'),
    );
  });

  it('answers malformed JSON with 400, not 500', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe/signup')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);

    expect(Object.keys(res.body).sort()).toEqual(ERROR_BODY_KEYS);
    expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  it('leaves the query string out of path', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope?token=abc').expect(404);

    expect(res.body.path).toBe('/api/v1/nope');
    expect(res.text).not.toContain('abc');
  });
});
