import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { TenantContextMissingError } from './tenancy.errors.js';

// Holds the authenticated tenant for the current async call chain. The id must come from
// server-side context (the auth guard or a job payload), never from request input.
@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<{ tenantId: string }>();

  run<T>(tenantId: string, fn: () => T): T {
    return this.storage.run({ tenantId }, fn);
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (tenantId === undefined) throw new TenantContextMissingError();
    return tenantId;
  }
}
