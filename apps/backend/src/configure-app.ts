import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';

// Kept apart from bootstrap.ts so tests can import it without loading AppModule,
// whose AppConfigModule validates process.env as soon as it is imported.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
}
