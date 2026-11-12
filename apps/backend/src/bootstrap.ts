import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  return app;
}
