import { PipeTransform, Injectable } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../enums/error-code.enum';

@Injectable()
export class MongoIdValidationPipe implements PipeTransform<string, string> {
  /**
   * MongoDB ObjectId 유효성 검증
   * - 24자리 hexadecimal 문자열이어야 함
   */
  transform(value: string): string {
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(value);

    if (!isValidObjectId) {
      throw new AppException(ErrorCode.INVALID_OBJECT_ID, { value });
    }

    return value;
  }
}
