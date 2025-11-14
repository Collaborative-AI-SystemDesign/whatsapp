import { Injectable, Logger, Inject } from '@nestjs/common';
import { MessagesService } from '../messages/services/messages.service';
import type { IQueueService, ICacheService } from '../common/interfaces';
import { IncomingMessageDto } from './dto';
import {
  QUEUE_SERVICE,
  CACHE_SERVICE,
} from '../common/constants/injection-tokens';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private messagesService: MessagesService,
    @Inject(QUEUE_SERVICE) private queueService: IQueueService,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService,
  ) {}

  /**
   * 사용자 연결 시 처리
   */
  async handleUserConnection(userId: string, serverId: string): Promise<void> {
    await this.cacheService.setUserConnection(userId, serverId);
    this.logger.log(`User ${userId} connected to ${serverId}`);
  }

  /**
   * 사용자 연결 해제 시 처리
   */
  async handleUserDisconnection(userId: string): Promise<void> {
    await this.cacheService.removeUserConnection(userId);
    this.logger.log(`User ${userId} disconnected`);
  }

  /**
   * 메시지 전송 처리
   *
   * @returns messageId - 생성된 메시지 ID
   */
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    timestamp: Date,
  ): Promise<string> {
    // 1. MongoDB에 메시지 저장
    const message = await this.messagesService.createMessage(
      senderId,
      receiverId,
      content,
      timestamp,
    );

    // 2. RabbitMQ에 발행
    await this.queueService.publishMessage({
      messageId: message.messageId,
      senderId,
      receiverId,
      content,
      timestamp: timestamp.toISOString(),
    });

    this.logger.log(
      `Message sent: ${message.messageId} from ${senderId} to ${receiverId}`,
    );

    return message.messageId;
  }

  /**
   * 메시지 전달 확인 처리
   */
  async markMessageAsDelivered(
    userId: string,
    messageId: string,
  ): Promise<void> {
    // MongoDB에서 undelivered 상태 업데이트
    await this.messagesService.markAsDelivered(messageId);

    // Redis inbox에서 제거
    await this.cacheService.removeFromInbox(userId, messageId);

    this.logger.log(`Message ${messageId} delivered to ${userId}`);
  }

  /**
   * 오프라인 메시지 목록 조회
   */
  async getOfflineMessages(userId: string): Promise<IncomingMessageDto[]> {
    // Redis inbox에서 미전달 메시지 ID 조회
    const messageIds = await this.cacheService.getInbox(userId);

    if (messageIds.length === 0) {
      return [];
    }

    this.logger.log(
      `Fetching ${String(messageIds.length)} offline messages for ${userId}`,
    );

    // 각 메시지를 MongoDB에서 조회하여 DTO로 변환
    const messages: IncomingMessageDto[] = [];

    for (const messageId of messageIds) {
      try {
        const message = await this.messagesService.findByMessageId(messageId);

        messages.push(
          new IncomingMessageDto(
            message.messageId,
            message.senderId,
            message.content,
            message.timestamp.getTime(),
          ),
        );
      } catch (error) {
        this.logger.error(
          `Failed to fetch offline message ${messageId}:`,
          error,
        );
      }
    }

    return messages;
  }

  /**
   * 사용자 온라인 여부 확인
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return await this.cacheService.isUserOnline(userId);
  }
}
