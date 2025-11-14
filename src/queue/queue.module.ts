import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QUEUE_SERVICE } from '../common/constants/injection-tokens';

@Module({
  providers: [
    {
      provide: QUEUE_SERVICE,
      useClass: QueueService,
    },
  ],
  exports: [QUEUE_SERVICE],
})
export class QueueModule {}
