import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { getApiStatus } from './api-status';

const READY_PATH = '/api/v1/health/ready';
let server: Server | undefined;

/** Starts a real HTTP server on a random port and returns its base URL. */
async function startApi(handler: Parameters<typeof createServer>[1]): Promise<string> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

describe('getApiStatus', () => {
  it("returns 'ok' when the readiness endpoint answers 200", async () => {
    const baseUrl = await startApi((req, res) => {
      res.statusCode = req.url === READY_PATH ? 200 : 404;
      res.end();
    });

    expect(await getApiStatus(baseUrl)).toBe('ok');
  });

  it("returns 'unavailable' when the readiness endpoint answers 503", async () => {
    const baseUrl = await startApi((_req, res) => {
      res.statusCode = 503;
      res.end();
    });

    expect(await getApiStatus(baseUrl)).toBe('unavailable');
  });

  it("returns 'unavailable' when nothing is listening", async () => {
    const baseUrl = await startApi((_req, res) => res.end());
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;

    expect(await getApiStatus(baseUrl)).toBe('unavailable');
  });

  it("returns 'unavailable' when the API does not answer within 2 seconds", async () => {
    const baseUrl = await startApi(() => {
      // Never respond.
    });

    const started = Date.now();
    expect(await getApiStatus(baseUrl)).toBe('unavailable');
    expect(Date.now() - started).toBeLessThan(3000);
  }, 5000);
});
