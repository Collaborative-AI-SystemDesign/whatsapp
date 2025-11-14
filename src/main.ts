import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

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

  // Global interceptor 활성화
  // 모든 성공 응답을 일관된 형식으로 변환
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Global exception filter 활성화
  // 모든 예외를 일관된 형식으로 처리
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
}
bootstrap();
