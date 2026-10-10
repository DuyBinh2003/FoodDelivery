import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RestaurantsModule } from '@/modules/restaurants/restaurants.module.js';
// TODO: Create a proper AppModule for this microservice

async function bootstrap() {
  const app = await NestFactory.create(RestaurantsModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(3002);
  console.log(' is running on: ');
}
await bootstrap();

