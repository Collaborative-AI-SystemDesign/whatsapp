import { Injectable, Logger, Inject } from '@nestjs/common';
import { MessagesService } from '../messages/services/messages.service';
import type {
  IQueueService,
  IUserConnectionCache,
  IMessageInboxCache,
} from '../common/interfaces';
import { IncomingMessageDto } from './dto';
import {
  QUEUE_SERVICE,
  USER_CONNECTION_CACHE,
  MESSAGE_INBOX_CACHE,
} from '../common/constants/injection-tokens';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private messagesService: MessagesService,
    @Inject(QUEUE_SERVICE) private queueService: IQueueService,
    @Inject(USER_CONNECTION_CACHE)
    private userConnectionCache: IUserConnectionCache,
    @Inject(MESSAGE_INBOX_CACHE) private messageInboxCache: IMessageInboxCache,
  ) {}

  /**
   * 사용자 연결 시 처리
   */
  async handleUserConnection(userId: string, serverId: string): Promise<void> {
    await this.userConnectionCache.setUserConnection(userId, serverId);
    this.logger.log(`User ${userId} connected to ${serverId}`);
  }

  /**
   * 사용자 연결 해제 시 처리
   */
  async handleUserDisconnection(userId: string): Promise<void> {
    await this.userConnectionCache.removeUserConnection(userId);
    this.logger.log(`User ${userId} disconnected`);
  }

  /**
   * 메시지 전송 처리 (보상 트랜잭션 패턴 적용)
   *
   * @returns messageId - 생성된 메시지 ID
   */
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    timestamp: Date,
  ): Promise<string> {
    let message: Awaited<ReturnType<typeof this.messagesService.createMessage>>;

    try {
      // 1. MongoDB에 메시지 저장
      message = await this.messagesService.createMessage(
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
    } catch (error) {
      // RabbitMQ 발행 실패 시 보상 트랜잭션: MongoDB에서 메시지 삭제
      if (message) {
        try {
          await this.messagesService.deleteByMessageId(message.messageId);
          this.logger.warn(
            `Compensated: Deleted message ${message.messageId} after RabbitMQ publish failure`,
          );
        } catch (deleteError) {
          this.logger.error(
            `Failed to compensate: Could not delete message ${message.messageId}`,
            deleteError,
          );
        }
      }

      this.logger.error(
        `Failed to send message from ${senderId} to ${receiverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 메시지 전달 확인 처리 (보상 트랜잭션 패턴 적용)
   */
  async markMessageAsDelivered(
    userId: string,
    messageId: string,
  ): Promise<void> {
    let wasMarkedAsDelivered = false;

    try {
      // 1. MongoDB에서 undelivered 상태 업데이트
      await this.messagesService.markAsDelivered(messageId);
      wasMarkedAsDelivered = true;

      // 2. Redis inbox에서 제거
      await this.messageInboxCache.removeFromInbox(userId, messageId);

      this.logger.log(`Message ${messageId} delivered to ${userId}`);
    } catch (error) {
      // Redis 작업 실패 시 보상 트랜잭션: MongoDB 상태 롤백
      if (wasMarkedAsDelivered) {
        try {
          // MongoDB에서 다시 undelivered 상태로 되돌림
          await this.messagesService.markAsUndelivered(messageId);
          this.logger.warn(
            `Compensated: Reverted message ${messageId} to undelivered after Redis failure`,
          );
        } catch (rollbackError) {
          this.logger.error(
            `Failed to compensate: Could not rollback message ${messageId}`,
            rollbackError,
          );
        }
      }

      this.logger.error(
        `Failed to mark message ${messageId} as delivered for ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 오프라인 메시지 목록 조회
   */
  async getOfflineMessages(userId: string): Promise<IncomingMessageDto[]> {
    // Redis inbox에서 미전달 메시지 ID 조회
    const messageIds = await this.messageInboxCache.getInbox(userId);

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
    return await this.userConnectionCache.isUserOnline(userId);
  }
}
