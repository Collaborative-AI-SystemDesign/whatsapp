import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService, MessagePayload } from './queue.service';
import { CacheService } from '../cache/cache.service';
import { ChatGateway } from '../chat/chat.gateway';
import { IncomingMessageDto } from '../chat/dto';

@Injectable()
export class QueueConsumer implements OnModuleInit {
  constructor(
    private queueService: QueueService,
    private cacheService: CacheService,
    private chatGateway: ChatGateway,
  ) {}

  async onModuleInit() {
    // Start consuming messages from RabbitMQ
    await this.queueService.consume(this.handleMessage.bind(this));
    console.log('QueueConsumer started listening for messages');
  }

  /**
   * RabbitMQ에서 메시지를 받아서 처리
   */
  private async handleMessage(payload: MessagePayload): Promise<void> {
    const { messageId, senderId, receiverId, content, timestamp } = payload;

    console.log(
      `Processing message: ${messageId} from ${senderId} to ${receiverId}`,
    );

    try {
      // 1. Redis에서 수신자 온라인 여부 확인
      const isOnline = await this.cacheService.isUserOnline(receiverId);

      // 2-1. 온라인인 경우: WebSocket으로 즉시 전송
      if (isOnline) {
        const incomingMessage = new IncomingMessageDto(
          messageId,
          senderId,
          content,
          new Date(timestamp).getTime(),
        );

        const sent = await this.chatGateway.sendMessageToUser(
          receiverId,
          incomingMessage,
        );

        if (sent) {
          console.log(`Message delivered online: ${messageId} to ${receiverId}`);
        } else {
          // WebSocket으로 전송 실패 (연결이 끊어진 경우)
          console.log(
            `Failed to deliver online, adding to inbox: ${messageId}`,
          );
          await this.addToOfflineInbox(receiverId, messageId, payload);
        }
      }
      // 2-2. 오프라인인 경우: Redis inbox에 저장
      else {
        console.log(`User offline, adding to inbox: ${messageId} for ${receiverId}`);
        await this.addToOfflineInbox(receiverId, messageId, payload);
      }
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);
      throw error; // Re-throw to trigger message requeue
    }
  }

  /**
   * 오프라인 inbox에 메시지 추가
   */
  private async addToOfflineInbox(
    receiverId: string,
    messageId: string,
    payload: MessagePayload,
  ): Promise<void> {
    // Redis inbox에 messageId 추가
    await this.cacheService.addToInbox(receiverId, messageId);

    // 메시지 데이터를 Redis에 캐싱 (선택적)
    await this.cacheService.cacheMessage(messageId, {
      senderId: payload.senderId,
      receiverId: payload.receiverId,
      content: payload.content,
      timestamp: payload.timestamp,
    });

    console.log(`Message added to inbox: ${messageId} for ${receiverId}`);
  }
}
