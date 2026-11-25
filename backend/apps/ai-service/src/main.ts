import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module.js';
import { GlobalExceptionFilter } from '@/common/filters/index.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Trace-Id'],
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = parseInt(process.env.AI_SERVICE_PORT || '3008', 10);
  await app.listen(port);
  console.log(`ai-service is running on: http://localhost:${port}`);
}

bootstrap();
