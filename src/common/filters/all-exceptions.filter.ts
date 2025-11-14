import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../enums/error-code.enum';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorCode: ErrorCode | undefined;
    let message: string | string[];
    let context: Record<string, unknown> | undefined;

    // 1. AppException
    if (exception instanceof AppException) {
      status = exception.getStatusCode();
      errorCode = exception.errorCode;
      message = exception.getMessage();
      context = exception.context;
    }

    // 2. Prisma 예외
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      errorCode = prismaError.errorCode;
      message = prismaError.message;
      context = prismaError.context;
    }

    // 3. NestJS HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if ('message' in exceptionResponse) {
        message = exceptionResponse.message as string | string[];
      } else {
        message = 'Internal server error';
      }
    }

    // 4. 알 수 없는 예외
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      // 프로덕션이 아닌 경우 에러 로그 출력
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unexpected error:', exception);
      }
    }

    // 일관된 에러 응답 형식
    const errorResponse = {
      success: false as const,
      error: {
        ...(errorCode !== undefined && { code: errorCode }),
        message: Array.isArray(message) ? message : [message],
        statusCode: status,
        ...(context !== undefined && { context }),
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Prisma 에러를 ErrorCode로 변환
   */
  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    errorCode: ErrorCode;
    message: string;
    context: Record<string, unknown>;
  } {
    const PRISMA_ERROR_MAP: Partial<Record<string, ErrorCode>> = {
      P2002: ErrorCode.DUPLICATE_KEY, // Unique constraint
      P2025: ErrorCode.USER_NOT_FOUND, // Record not found
      P2003: ErrorCode.FOREIGN_KEY_CONSTRAINT, // Foreign key constraint
      P2011: ErrorCode.NULL_CONSTRAINT_VIOLATION, // Null constraint
      P2014: ErrorCode.INVALID_OBJECT_ID, // Invalid ID (MongoDB)
    };

    const errorCode =
      PRISMA_ERROR_MAP[exception.code] ?? ErrorCode.DATABASE_ERROR;
    const context: Record<string, unknown> = {
      prismaCode: exception.code,
    };

    // P2002 (Unique constraint)인 경우 필드명 추가
    if (exception.code === 'P2002' && exception.meta?.target !== undefined) {
      const target = exception.meta.target;
      context.field = Array.isArray(target)
        ? target.join(', ')
        : typeof target === 'string'
          ? target
          : JSON.stringify(target);
    }

    // P2011 (Null constraint)인 경우 컬럼명 추가
    if (exception.code === 'P2011' && exception.meta?.column !== undefined) {
      context.column = exception.meta.column;
    }

    // AppException으로 변환하여 status와 message 가져오기
    const appException = new AppException(errorCode, context);

    return {
      status: appException.getStatusCode(),
      errorCode: appException.errorCode,
      message: appException.getMessage(),
      context: appException.context ?? {},
    };
  }
}
