import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import {
  USER_CONNECTION_CACHE,
  MESSAGE_INBOX_CACHE,
  MESSAGE_CACHE,
} from '../common/constants/injection-tokens';

@Module({
  providers: [
    CacheService, // 실제 구현체
    {
      provide: USER_CONNECTION_CACHE,
      useExisting: CacheService,
    },
    {
      provide: MESSAGE_INBOX_CACHE,
      useExisting: CacheService,
    },
    {
      provide: MESSAGE_CACHE,
      useExisting: CacheService,
    },
  ],
  exports: [USER_CONNECTION_CACHE, MESSAGE_INBOX_CACHE, MESSAGE_CACHE],
})
export class CacheModule {}
