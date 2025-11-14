import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MessagesModule } from '../messages/messages.module';
import { QueueModule } from '../queue/queue.module';
import { CacheModule } from '../cache/cache.module';
import { QueueConsumer } from '../queue/queue.consumer';

@Module({
  imports: [MessagesModule, QueueModule, CacheModule],
  providers: [ChatGateway, ChatService, QueueConsumer],
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}
