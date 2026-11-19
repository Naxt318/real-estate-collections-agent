import { Injectable } from '@nestjs/common';
import { TenantContext } from '../common/tenancy/tenant-context.js';
import type { User } from '../generated/prisma/client.js';
import type { TenantTx } from '../infrastructure/database/tenant-transaction-runner.js';

const DEFAULT_TAKE = 50;
const MAX_TAKE = 100;

// tenantId always comes from TenantContext. The explicit where is defence in depth beside RLS.
@Injectable()
export class UsersRepository {
  constructor(private readonly tenantContext: TenantContext) {}

  list(tx: TenantTx, page: { take?: number; skip?: number } = {}): Promise<User[]> {
    const take = Math.min(Math.max(page.take ?? DEFAULT_TAKE, 1), MAX_TAKE);
    return tx.user.findMany({
      where: { tenantId: this.tenantContext.requireTenantId() },
      orderBy: { createdAt: 'asc' },
      take,
      skip: Math.max(page.skip ?? 0, 0),
    });
  }

  create(tx: TenantTx, input: { email: string; name?: string }): Promise<User> {
    return tx.user.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        email: input.email.trim().toLowerCase(),
        name: input.name,
      },
    });
  }
}
