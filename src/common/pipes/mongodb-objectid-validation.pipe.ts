import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class MongoIdValidationPipe implements PipeTransform<string, string> {
  /**
   * MongoDB ObjectId 유효성 검증
   * - 24자리 hexadecimal 문자열이어야 함
   */
  transform(value: string): string {
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(value);

    if (!isValidObjectId) {
      throw new BadRequestException(`Invalid MongoDB ObjectId: ${value}`);
    }

    return value;
  }
}
