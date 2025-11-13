import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../interfaces/response.interface';

/**
 * 모든 성공 응답을 일관된 형식으로 변환하는 Interceptor
 */
@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data: T) => {
        // Controller에서 이미 { success: true, data: ... } 형식으로 반환한 경우
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data &&
          'timestamp' in data
        ) {
          return data as SuccessResponse<T>;
        }

        // 일반 데이터를 반환한 경우
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
