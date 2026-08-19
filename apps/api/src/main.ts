import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  if (corsOrigins?.length) app.enableCors({ origin: corsOrigins });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001, process.env.HOST ?? '0.0.0.0');
}

void bootstrap();
