import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        status = HttpStatus.CONFLICT;
        message = `Duplicate value for ${(exception.meta?.target as string[])?.join(', ') || 'field'}`;
        break;

      case 'P2025': // Record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;

      case 'P2003': // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid reference to related record';
        break;

      case 'P2011': // Null constraint violation
        status = HttpStatus.BAD_REQUEST;
        message = `Required field ${exception.meta?.column as string} cannot be null`;
        break;

      case 'P2014': // Invalid ID (MongoDB ObjectId)
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid ID format';
        break;

      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database error occurred';
    }

    response.status(status).json({
      status: 'error',
      statusCode: status,
      message: [message],
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
