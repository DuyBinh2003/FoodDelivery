import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AdminModule } from '@/modules/admin/admin.module.js';
// TODO: Create a proper AppModule for this microservice

async function bootstrap() {
  const app = await NestFactory.create(AdminModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(3005);
  console.log(' is running on: ');
}
await bootstrap();

