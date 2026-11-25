import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const port = resolveServicePort('ORDER_SERVICE_PORT', 4004);
  await app.listen(port);
  console.log(`order-service is running on: http://localhost:${port}`);
}
bootstrap();

