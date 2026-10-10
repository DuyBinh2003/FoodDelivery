import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SearchModule } from '@/modules/search/search.module.js';
// TODO: Create a proper AppModule for this microservice

async function bootstrap() {
  const app = await NestFactory.create(SearchModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(3006);
  console.log(' is running on: ');
}
await bootstrap();

