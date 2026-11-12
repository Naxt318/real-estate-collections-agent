import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';

@Module({ imports: [AppConfigModule, DatabaseModule] })
export class AppModule {}
