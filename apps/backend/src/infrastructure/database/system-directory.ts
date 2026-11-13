import { Inject, Injectable } from '@nestjs/common';
import type { CrmSource, IntegrationStatus, PrismaClient } from '../../generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

export interface ResolvedIntegrationConnection {
  tenantId: string;
  source: CrmSource;
  secretRef: string;
  status: IntegrationStatus;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The only sanctioned cross-tenant read path (background jobs, CRM webhooks). It calls two
// SECURITY DEFINER SQL functions and never sets app.tenant_id, so RLS stays intact for everything else.
@Injectable()
export class SystemDirectory {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaClient) {}

  async listActiveTenantIds(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT app_active_tenant_ids() AS id`;
    return rows.map((r) => r.id);
  }

  async resolveIntegrationConnection(
    connectionId: string,
  ): Promise<ResolvedIntegrationConnection | null> {
    if (!UUID.test(connectionId)) return null;
    const rows = await this.prisma.$queryRaw<
      { tenant_id: string; source: CrmSource; secret_ref: string; status: IntegrationStatus }[]
    >`SELECT * FROM app_resolve_integration_connection(${connectionId}::uuid)`;
    const row = rows[0];
    if (!row) return null;
    return {
      tenantId: row.tenant_id,
      source: row.source,
      secretRef: row.secret_ref,
      status: row.status,
    };
  }
}
