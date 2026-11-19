import { createHash } from 'node:crypto';

// Deterministic RFC 4122 v5-style UUID from SHA-1 of the parts, so re-running the seed
// addresses the same rows instead of creating new ones.
export function demoUuid(...parts: string[]): string {
  const bytes = createHash('sha1').update(parts.join(':')).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type DemoTenantKey = 'A' | 'B';

export const DEMO_TENANTS: Record<
  DemoTenantKey,
  { id: string; name: string; emailPrefix: string }
> = {
  A: {
    id: '00000000-0000-4000-8000-00000000000a',
    name: 'DEMO — Builder A',
    emailPrefix: 'demo-a',
  },
  B: {
    id: '00000000-0000-4000-8000-00000000000b',
    name: 'DEMO — Builder B',
    emailPrefix: 'demo-b',
  },
};
