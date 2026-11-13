import { Module } from '@nestjs/common';
import { TenancyModule } from './common/tenancy/tenancy.module.js';
import { AppConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { UsersModule } from './users/users.module.js';

@Module({ imports: [AppConfigModule, TenancyModule, DatabaseModule, UsersModule, HealthModule] })
export class AppModule {}
