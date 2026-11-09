import { env } from '@/env';

export type ApiStatus = 'ok' | 'unavailable';

const READINESS_TIMEOUT_MS = 2000;

/**
 * Checks backend readiness from the server. Never throws: any network error,
 * timeout or non-2xx response is reported as 'unavailable'.
 */
export async function getApiStatus(baseUrl: string = env.API_BASE_URL): Promise<ApiStatus> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(READINESS_TIMEOUT_MS),
    });
    return res.ok ? 'ok' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
