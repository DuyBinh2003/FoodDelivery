import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from '@/app.module.js';
import { GlobalExceptionFilter } from '@/common/filters/index.js';
import { RedisIoAdapter } from '@/common/adapters/index.js';
import { TracingInterceptor } from '@/common/interceptors/index.js';
import { configureAppCors, resolveServicePort } from '@/common/bootstrap/index.js';

async function bootstrap() {
  const logger = new Logger('DeliveryServiceBootstrap');
  const app = await NestFactory.create(AppModule);
  configureAppCors(app);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TracingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const redisIoAdapter = new RedisIoAdapter(app);
  try {
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    logger.log('Socket.IO clustered with Redis Adapter successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Redis adapter unavailable (${msg}), continuing with default in-memory adapter.`);
  }

  const port = resolveServicePort('DELIVERY_SERVICE_PORT', 4005);
  await app.listen(port);
  logger.log(`delivery-service is running on: http://localhost:${port}`);
}
bootstrap();
