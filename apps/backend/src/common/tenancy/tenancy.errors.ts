export class TenantContextMissingError extends Error {
  constructor() {
    super('No tenant context: tenant-owned data can only be accessed inside TenantContext.run');
    this.name = 'TenantContextMissingError';
  }
}

export class InvalidTenantIdError extends Error {
  constructor() {
    super('Tenant id must be a UUID');
    this.name = 'InvalidTenantIdError';
  }
}
