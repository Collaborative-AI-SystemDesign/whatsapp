import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '../enums/error-code.enum';
import { ERROR_MESSAGES } from '../constants/error-messages.constant';

// 애플리케이션 전역 예외 클래스
export class AppException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    public readonly context?: Record<string, unknown>,
  ) {
    const errorMeta = ERROR_MESSAGES[errorCode];

    super(
      {
        errorCode,
        message: errorMeta.message,
        context,
      },
      errorMeta.statusCode,
    );
  }

  /**
   * 에러 메시지 반환
   */
  getMessage(): string {
    return ERROR_MESSAGES[this.errorCode].message;
  }

  /**
   * HTTP 상태 코드 반환
   */
  getStatusCode(): number {
    return ERROR_MESSAGES[this.errorCode].statusCode;
  }
}
