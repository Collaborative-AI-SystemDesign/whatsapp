import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe 활성화
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 자동 제거
      forbidNonWhitelisted: true, // DTO에 없는 속성 전달 시 에러
      transform: true, // payload를 DTO 인스턴스로 자동 변환
    }),
  );

  // Global exception filters 활성화
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new HttpExceptionFilter(),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
