import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module.js';
// TODO: Create a proper AppModule for this microservice

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(3001);
  console.log(' is running on: ');
}
await bootstrap();

