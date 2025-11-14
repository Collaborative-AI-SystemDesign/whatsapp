import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CACHE_SERVICE } from '../common/constants/injection-tokens';

@Module({
  providers: [
    {
      provide: CACHE_SERVICE,
      useClass: CacheService,
    },
  ],
  exports: [CACHE_SERVICE],
})
export class CacheModule {}
