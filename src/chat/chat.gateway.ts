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
import {
  Injectable,
  UsePipes,
  ValidationPipe,
  Logger,
  Inject,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import type { IConnectionManager } from '../common/interfaces';
import { CONNECTION_MANAGER } from '../common/constants/injection-tokens';
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
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    @Inject(CONNECTION_MANAGER) private connectionManager: IConnectionManager,
  ) {}

  /**
   * 클라이언트 연결 처리
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // 쿼리 파라미터에서 userId 추출 (실제로는 JWT 토큰에서 추출해야 함)
      const userId = client.handshake.query.userId as string;

      if (!userId) {
        this.logger.error('Connection rejected: No userId provided');
        client.disconnect();
        return;
      }

      // ConnectionManager에 매핑 저장
      this.connectionManager.addConnection(userId, client.id);

      // ChatService에 위임
      await this.chatService.handleUserConnection(userId, 'server-1');

      this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);

      // 오프라인 중 받은 메시지 전송
      await this.sendOfflineMessages(userId, client);
    } catch (error) {
      this.logger.error('Error in handleConnection:', error);
      client.disconnect();
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  async handleDisconnect(client: Socket): Promise<void> {
    try {
      const userId = this.connectionManager.getUserId(client.id);

      if (userId != null) {
        // ConnectionManager에서 매핑 제거
        this.connectionManager.removeConnection(userId);

        // ChatService에 위임
        await this.chatService.handleUserDisconnection(userId);

        this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}`);
      }
    } catch (error) {
      this.logger.error('Error in handleDisconnect:', error);
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
      const senderId = this.connectionManager.getUserId(client.id);

      if (senderId == null) {
        this.logger.error('Send message failed: User not authenticated');
        return;
      }

      const { receiver_id, content, message_id_by_client, timestamp } = data;

      // ChatService에 위임 (비즈니스 로직)
      const messageId = await this.chatService.sendMessage(
        senderId,
        receiver_id,
        content,
        new Date(timestamp),
      );

      // Gateway는 WebSocket 통신만 담당
      const response = new MessageReceivedDto(messageId, message_id_by_client);
      client.emit('message_received', response);
    } catch (error) {
      this.logger.error('Error in handleSendMessage:', error);
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
      const userId = this.connectionManager.getUserId(client.id);

      if (userId == null) {
        this.logger.error('Message delivered failed: User not authenticated');
        return;
      }

      const { message_id } = data;

      // ChatService에 위임
      await this.chatService.markMessageAsDelivered(userId, message_id);

      this.logger.log(`Message delivered: ${message_id} to ${userId}`);
    } catch (error) {
      this.logger.error('Error in handleMessageDelivered:', error);
    }
  }

  /**
   * 특정 사용자에게 메시지 전송 (서버 내부 호출용)
   */
  sendMessageToUser(receiverId: string, message: IncomingMessageDto): boolean {
    const socketId = this.connectionManager.getSocketId(receiverId);

    if (socketId == null) {
      return false;
    }

    this.server.to(socketId).emit('incoming_message', message);
    this.logger.log(
      `Message sent to user ${receiverId}: ${message.message_id}`,
    );
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
      // ChatService에서 오프라인 메시지 조회
      const messages = await this.chatService.getOfflineMessages(userId);

      if (messages.length === 0) {
        return;
      }

      this.logger.log(
        `Sending ${String(messages.length)} offline messages to ${userId}`,
      );

      // Gateway는 WebSocket 전송만 담당
      for (const message of messages) {
        client.emit('incoming_message', message);
      }
    } catch (error) {
      this.logger.error('Error in sendOfflineMessages:', error);
    }
  }

  /**
   * 사용자가 온라인인지 확인
   */
  isUserOnline(userId: string): boolean {
    return this.connectionManager.isConnected(userId);
  }
}
