import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagesService } from '../messages/services/messages.service';
import { QueueService } from '../queue/queue.service';
import { CacheService } from '../cache/cache.service';
import {
  SendMessageDto,
  MessageReceivedDto,
  IncomingMessageDto,
  MessageDeliveredDto,
} from './dto';

@WebSocketGateway({
  cors: {
    origin: '*', // 프로덕션에서는 특정 도메인으로 제한
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId -> socketId 매핑
  private userSocketMap: Map<string, string> = new Map();
  // socketId -> userId 매핑
  private socketUserMap: Map<string, string> = new Map();

  constructor(
    private messagesService: MessagesService,
    private queueService: QueueService,
    private cacheService: CacheService,
  ) {}

  /**
   * 클라이언트 연결 처리
   */
  async handleConnection(client: Socket) {
    try {
      // 쿼리 파라미터에서 userId 추출 (실제로는 JWT 토큰에서 추출해야 함)
      const userId = client.handshake.query.userId as string;

      if (!userId) {
        console.error('Connection rejected: No userId provided');
        client.disconnect();
        return;
      }

      // 매핑 저장
      this.userSocketMap.set(userId, client.id);
      this.socketUserMap.set(client.id, userId);

      // Redis에 연결 정보 저장
      await this.cacheService.setUserConnection(userId, 'server-1'); // TODO: 실제 서버 ID 사용

      console.log(`Client connected: ${client.id}, userId: ${userId}`);

      // 오프라인 중 받은 메시지 전송
      await this.sendOfflineMessages(userId, client);
    } catch (error) {
      console.error('Error in handleConnection:', error);
      client.disconnect();
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  async handleDisconnect(client: Socket) {
    try {
      const userId = this.socketUserMap.get(client.id);

      if (userId) {
        // 매핑 제거
        this.userSocketMap.delete(userId);
        this.socketUserMap.delete(client.id);

        // Redis에서 연결 정보 제거
        await this.cacheService.removeUserConnection(userId);

        console.log(`Client disconnected: ${client.id}, userId: ${userId}`);
      }
    } catch (error) {
      console.error('Error in handleDisconnect:', error);
    }
  }

  /**
   * 메시지 전송 이벤트 처리
   */
  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ): Promise<void> {
    try {
      const senderId = this.socketUserMap.get(client.id);

      if (!senderId) {
        console.error('Send message failed: User not authenticated');
        return;
      }

      const { receiver_id, content, message_id_by_client, timestamp } = data;

      // 1. MongoDB에 메시지 저장
      const message = await this.messagesService.createMessage(
        senderId,
        receiver_id,
        content,
        new Date(timestamp),
      );

      // 2. RabbitMQ에 publish
      await this.queueService.publishMessage({
        messageId: message.messageId,
        senderId,
        receiverId: receiver_id,
        content,
        timestamp: new Date(timestamp).toISOString(),
        messageIdByClient: message_id_by_client,
      });

      // 3. 발신자에게 message_received 응답
      const response = new MessageReceivedDto(
        message.messageId,
        message_id_by_client,
      );
      client.emit('message_received', response);

      console.log(
        `Message queued: ${message.messageId} from ${senderId} to ${receiver_id}`,
      );
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * 메시지 전달 확인 이벤트 처리
   */
  @SubscribeMessage('message_delivered')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleMessageDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MessageDeliveredDto,
  ): Promise<void> {
    try {
      const userId = this.socketUserMap.get(client.id);

      if (!userId) {
        console.error('Message delivered failed: User not authenticated');
        return;
      }

      const { message_id } = data;

      // MongoDB에서 undelivered 상태 업데이트
      await this.messagesService.markAsDelivered(message_id);

      // Redis inbox에서 제거
      await this.cacheService.removeFromInbox(userId, message_id);

      console.log(`Message delivered: ${message_id} to ${userId}`);
    } catch (error) {
      console.error('Error in handleMessageDelivered:', error);
    }
  }

  /**
   * 특정 사용자에게 메시지 전송 (서버 내부 호출용)
   */
  async sendMessageToUser(
    receiverId: string,
    message: IncomingMessageDto,
  ): Promise<boolean> {
    const socketId = this.userSocketMap.get(receiverId);

    if (!socketId) {
      return false;
    }

    this.server.to(socketId).emit('incoming_message', message);
    console.log(`Message sent to user ${receiverId}: ${message.message_id}`);
    return true;
  }

  /**
   * 오프라인 중 받은 메시지 전송
   */
  private async sendOfflineMessages(
    userId: string,
    client: Socket,
  ): Promise<void> {
    try {
      // Redis inbox에서 미전달 메시지 ID 조회
      const messageIds = await this.cacheService.getInbox(userId);

      if (messageIds.length === 0) {
        return;
      }

      console.log(
        `Sending ${messageIds.length} offline messages to ${userId}`,
      );

      // 각 메시지를 MongoDB에서 조회하여 전송
      for (const messageId of messageIds) {
        try {
          const message = await this.messagesService.findByMessageId(messageId);

          const incomingMessage = new IncomingMessageDto(
            message.messageId,
            message.senderId,
            message.content,
            message.timestamp.getTime(),
          );

          client.emit('incoming_message', incomingMessage);
        } catch (error) {
          console.error(
            `Failed to send offline message ${messageId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Error in sendOfflineMessages:', error);
    }
  }

  /**
   * 사용자가 온라인인지 확인
   */
  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }
}
