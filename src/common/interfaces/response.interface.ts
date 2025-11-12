/**
 * API 공통 응답 인터페이스
 */

/**
 * 성공 응답
 */
export interface SuccessResponse<T = any> {
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
    context?: Record<string, any>;
  };
  path: string;
  timestamp: string;
}

/**
 * API 응답 (성공 또는 실패)
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
