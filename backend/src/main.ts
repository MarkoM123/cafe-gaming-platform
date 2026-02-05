import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // briše nepoznata polja
      forbidNonWhitelisted: true, // baca error ako se pošalje višak
      transform: true,            // JSON -> DTO klasa
    }),
  );

  await app.listen(3001);
}
bootstrap();
