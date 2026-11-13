import { Inject, Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/tenancy/tenant-context.js';
import { InvalidTenantIdError } from '../../common/tenancy/tenancy.errors.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

export type TenantTx = Prisma.TransactionClient;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The only way to reach tenant-owned tables. app.tenant_id is set transaction-locally
// (set_config(..., true)), so it is cleared on commit or rollback and cannot leak through the pool.
@Injectable()
export class TenantTransactionRunner {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaClient,
    private readonly tenantContext: TenantContext,
  ) {}

  async run<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const tenantId = this.tenantContext.requireTenantId();
    if (!UUID.test(tenantId)) throw new InvalidTenantIdError();
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  // For jobs, the auth guard and tests, where no context is active yet.
  runAs<T>(tenantId: string, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return this.tenantContext.run(tenantId, () => this.run(fn));
  }
}
