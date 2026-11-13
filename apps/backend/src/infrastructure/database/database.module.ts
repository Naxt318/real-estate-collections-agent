import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { TenantTransactionRunner } from './tenant-transaction-runner.js';

@Global()
@Module({
  providers: [PrismaService, TenantTransactionRunner],
  exports: [PrismaService, TenantTransactionRunner],
})
export class DatabaseModule {}
