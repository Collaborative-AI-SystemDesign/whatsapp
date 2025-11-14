import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ConnectionManager } from './connection.manager';
import { MessagesModule } from '../messages/messages.module';
import { QueueModule } from '../queue/queue.module';
import { CacheModule } from '../cache/cache.module';
import { QueueConsumer } from '../queue/queue.consumer';
import { CONNECTION_MANAGER } from '../common/constants/injection-tokens';

@Module({
  imports: [MessagesModule, QueueModule, CacheModule],
  providers: [
    ChatGateway,
    ChatService,
    QueueConsumer,
    {
      provide: CONNECTION_MANAGER,
      useClass: ConnectionManager,
    },
  ],
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}
