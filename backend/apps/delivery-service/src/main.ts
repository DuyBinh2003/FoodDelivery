import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DriversModule } from '@/modules/drivers/drivers.module.js';
// TODO: Create a proper AppModule for this microservice

async function bootstrap() {
  const app = await NestFactory.create(DriversModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(3004);
  console.log(' is running on: ');
}
await bootstrap();

