/**
 * API 공통 응답 인터페이스
 */

/**
 * 성공 응답
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * 에러 응답
 */
export interface ErrorResponse {
  success: false;
  error: {
    code?: string;
    message: string | string[];
    statusCode: number;
    context?: Record<string, unknown>;
  };
  path: string;
  timestamp: string;
}

/**
 * API 응답 (성공 또는 실패)
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;
