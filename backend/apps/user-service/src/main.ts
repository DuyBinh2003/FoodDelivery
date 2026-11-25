import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module.js';
import { GlobalExceptionFilter } from '@/common/filters/index.js';
import { configureAppCors, resolveServicePort } from '@/common/bootstrap/index.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureAppCors(app);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const port = resolveServicePort('USER_SERVICE_PORT', 4001);
  await app.listen(port);
  console.log(`user-service is running on: http://localhost:${port}`);
}
bootstrap();
