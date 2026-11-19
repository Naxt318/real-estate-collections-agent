import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { SystemDirectory } from './system-directory.js';
import { TenantTransactionRunner } from './tenant-transaction-runner.js';

@Global()
@Module({
  providers: [PrismaService, TenantTransactionRunner, SystemDirectory],
  exports: [PrismaService, TenantTransactionRunner, SystemDirectory],
})
export class DatabaseModule {}
