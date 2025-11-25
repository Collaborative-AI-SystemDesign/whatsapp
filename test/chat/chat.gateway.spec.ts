/**
 * ChatGateway 테스트 스위트
 * 
 * 이 테스트는 WebSocket 게이트웨이의 기능을 검증합니다.
 * - 클라이언트 연결/해제 처리
 * - 메시지 전송 및 수신
 * - 메시지 전달 확인 처리
 * - 오프라인 메시지 전송
 * - 사용자 온라인 상태 확인
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ChatGateway } from '../../src/chat/chat.gateway';
import { ChatService } from '../../src/chat/chat.service';
import { CONNECTION_MANAGER } from '../../src/common/constants/injection-tokens';
import type { IConnectionManager } from '../../src/common/interfaces';
import { SendMessageDto } from '../../src/chat/dto/send-message.dto';
import { MessageDeliveredDto } from '../../src/chat/dto/message-delivered.dto';
import { IncomingMessageDto } from '../../src/chat/dto/incoming-message.dto';
import { Server, Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: jest.Mocked<ChatService>;
  let connectionManager: jest.Mocked<IConnectionManager>;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;

  /**
   * 각 테스트 전에 실행되는 설정
   * - ChatService, ConnectionManager, Server, Socket을 모킹하여 테스트 환경 구성
   * - 모든 의존성을 모킹 객체로 주입하여 실제 외부 서비스와 분리된 테스트 실행
   */
  beforeEach(async () => {
    const mockChatService = {
      handleUserConnection: jest.fn(),
      handleUserDisconnection: jest.fn(),
      sendMessage: jest.fn(),
      markMessageAsDelivered: jest.fn(),
      getOfflineMessages: jest.fn(),
      isUserOnline: jest.fn(),
    };

    const mockConnectionManager = {
      addConnection: jest.fn(),
      removeConnection: jest.fn(),
      getSocketId: jest.fn(),
      getUserId: jest.fn(),
      isConnected: jest.fn(),
      getConnectionCount: jest.fn(),
      clearAll: jest.fn(),
      getAllConnections: jest.fn(),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    mockSocket = {
      id: 'socket-123',
      handshake: {
        query: { userId: 'user-1' },
      },
      disconnect: jest.fn(),
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: CONNECTION_MANAGER,
          useValue: mockConnectionManager,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get(ChatService);
    connectionManager = module.get(CONNECTION_MANAGER);

    // Set server mock
    gateway.server = mockServer;

    jest.clearAllMocks();
  });


  /**
   * handleConnection 테스트 그룹
   * WebSocket 클라이언트 연결 처리를 테스트합니다.
   */
  describe('handleConnection', () => {
    /**
     * 정상적인 연결 처리 테스트
     * - userId가 쿼리 파라미터로 제공된 경우
     * - ConnectionManager에 연결 추가
     * - ChatService에 연결 정보 전달
     * - 오프라인 메시지 조회 호출
     */
    it('should handle successful connection', async () => {
      const userId = 'user-1';
      mockSocket.handshake.query.userId = userId;
      connectionManager.getUserId.mockReturnValue(userId);
      chatService.handleUserConnection.mockResolvedValue(undefined);
      chatService.getOfflineMessages.mockResolvedValue([]);

      await gateway.handleConnection(mockSocket);

      expect(connectionManager.addConnection).toHaveBeenCalledWith(
        userId,
        mockSocket.id,
      );
      expect(chatService.handleUserConnection).toHaveBeenCalledWith(
        userId,
        'server-1',
      );
      expect(chatService.getOfflineMessages).toHaveBeenCalledWith(userId);
    });

    /**
     * userId가 제공되지 않은 경우 연결 거부 테스트
     * - userId가 없는 경우 소켓 연결을 끊음
     * - ConnectionManager에 연결을 추가하지 않음
     */
    it('should disconnect when userId is not provided', async () => {
      mockSocket.handshake.query.userId = undefined;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(connectionManager.addConnection).not.toHaveBeenCalled();
    });

    /**
     * 연결 시 오프라인 메시지 전송 테스트
     * - 오프라인 중 받은 메시지가 있는 경우
     * - 연결 시 모든 오프라인 메시지를 클라이언트에 전송
     * - incoming_message 이벤트로 메시지 전달
     */
    it('should send offline messages on connection', async () => {
      const userId = 'user-1';
      const offlineMessages = [
        new IncomingMessageDto('msg-1', 'user-2', 'Hello', 1234567890),
        new IncomingMessageDto('msg-2', 'user-2', 'World', 1234567891),
      ];

      mockSocket.handshake.query.userId = userId;
      connectionManager.getUserId.mockReturnValue(userId);
      chatService.handleUserConnection.mockResolvedValue(undefined);
      chatService.getOfflineMessages.mockResolvedValue(offlineMessages);

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledTimes(2);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'incoming_message',
        offlineMessages[0],
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'incoming_message',
        offlineMessages[1],
      );
    });

  });

  /**
   * handleDisconnect 테스트 그룹
   * WebSocket 클라이언트 연결 해제 처리를 테스트합니다.
   */
  describe('handleDisconnect', () => {
    /**
     * 정상적인 연결 해제 처리 테스트
     * - userId를 찾아 ConnectionManager에서 제거
     * - ChatService에 연결 해제 정보 전달
     */
    it('should handle successful disconnection', async () => {
      const userId = 'user-1';
      connectionManager.getUserId.mockReturnValue(userId);
      chatService.handleUserDisconnection.mockResolvedValue(undefined);

      await gateway.handleDisconnect(mockSocket);

      expect(connectionManager.removeConnection).toHaveBeenCalledWith(userId);
      expect(chatService.handleUserDisconnection).toHaveBeenCalledWith(userId);
    });

    /**
     * userId를 찾을 수 없는 경우 처리 테스트
     * - 소켓 ID로 userId를 찾지 못한 경우
     * - 연결 제거 및 서비스 호출을 건너뜀
     */
    it('should handle disconnection when userId is not found', async () => {
      connectionManager.getUserId.mockReturnValue(undefined);

      await gateway.handleDisconnect(mockSocket);

      expect(connectionManager.removeConnection).not.toHaveBeenCalled();
      expect(chatService.handleUserDisconnection).not.toHaveBeenCalled();
    });

  });

  /**
   * handleSendMessage 테스트 그룹
   * 클라이언트로부터 메시지 전송 요청을 처리하는 기능을 테스트합니다.
   */
  describe('handleSendMessage', () => {
    /**
     * 정상적인 메시지 전송 테스트
     * - 인증된 사용자가 메시지를 전송하는 경우
     * - ChatService를 통해 메시지 저장 및 큐에 발행
     * - 클라이언트에 message_received 이벤트로 응답 전송
     */
    it('should send message successfully', async () => {
      const userId = 'user-1';
      const sendMessageDto: SendMessageDto = {
        receiver_id: 'user-2',
        content: 'Hello',
        message_id_by_client: 1,
        timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
      };
      const messageId = 'server-msg-123';

      connectionManager.getUserId.mockReturnValue(userId);
      chatService.sendMessage.mockResolvedValue(messageId);

      await gateway.handleSendMessage(mockSocket, sendMessageDto);

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        userId,
        sendMessageDto.receiver_id,
        sendMessageDto.content,
        expect.any(Date),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'message_received',
        expect.objectContaining({
          message_id: messageId,
          message_id_by_client: sendMessageDto.message_id_by_client,
          action: 'message_received',
        }),
      );
    });

    /**
     * 인증되지 않은 사용자의 메시지 전송 시도 테스트
     * - userId를 찾을 수 없는 경우
     * - 메시지 전송을 수행하지 않고 error 이벤트 전송
     */
    it('should emit error when user is not authenticated', async () => {
      const sendMessageDto: SendMessageDto = {
        receiver_id: 'user-2',
        content: 'Hello',
        message_id_by_client: 1,
        timestamp: Date.now(),
      };

      connectionManager.getUserId.mockReturnValue(undefined);

      await gateway.handleSendMessage(mockSocket, sendMessageDto);

      expect(chatService.sendMessage).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to send message',
      });
    });

  });

  /**
   * handleMessageDelivered 테스트 그룹
   * 메시지 전달 확인 처리를 테스트합니다.
   */
  describe('handleMessageDelivered', () => {
    /**
     * 정상적인 메시지 전달 확인 처리 테스트
     * - 인증된 사용자가 메시지 전달을 확인하는 경우
     * - ChatService를 통해 메시지를 전달 완료로 표시
     */
    it('should mark message as delivered successfully', async () => {
      const userId = 'user-1';
      const messageDeliveredDto: MessageDeliveredDto = {
        message_id: 'msg-123',
        timestamp: Date.now(),
      };

      connectionManager.getUserId.mockReturnValue(userId);
      chatService.markMessageAsDelivered.mockResolvedValue(undefined);

      await gateway.handleMessageDelivered(mockSocket, messageDeliveredDto);

      expect(chatService.markMessageAsDelivered).toHaveBeenCalledWith(
        userId,
        messageDeliveredDto.message_id,
      );
    });

    /**
     * 인증되지 않은 사용자의 전달 확인 시도 테스트
     * - userId를 찾을 수 없는 경우 처리하지 않음
     */
    it('should not process when user is not authenticated', async () => {
      const messageDeliveredDto: MessageDeliveredDto = {
        message_id: 'msg-123',
        timestamp: Date.now(),
      };

      connectionManager.getUserId.mockReturnValue(undefined);

      await gateway.handleMessageDelivered(mockSocket, messageDeliveredDto);

      expect(chatService.markMessageAsDelivered).not.toHaveBeenCalled();
    });

  });

  /**
   * sendMessageToUser 테스트 그룹
   * 특정 사용자에게 메시지를 전송하는 기능을 테스트합니다.
   */
  describe('sendMessageToUser', () => {
    /**
     * 온라인 사용자에게 메시지 전송 테스트
     * - 수신자가 온라인 상태인 경우
     * - 해당 소켓으로 incoming_message 이벤트 전송
     * - true 반환 (전송 성공)
     */
    it('should send message to online user', () => {
      const receiverId = 'user-2';
      const socketId = 'socket-456';
      const message = new IncomingMessageDto(
        'msg-123',
        'user-1',
        'Hello',
        Date.now(),
      );

      connectionManager.getSocketId.mockReturnValue(socketId);

      const result = gateway.sendMessageToUser(receiverId, message);

      expect(connectionManager.getSocketId).toHaveBeenCalledWith(receiverId);
      expect(mockServer.to).toHaveBeenCalledWith(socketId);
      expect(mockServer.emit).toHaveBeenCalledWith('incoming_message', message);
      expect(result).toBe(true);
    });

    /**
     * 오프라인 사용자에게 메시지 전송 시도 테스트
     * - 수신자가 오프라인 상태인 경우
     * - 메시지를 전송하지 않고 false 반환
     */
    it('should return false when user is offline', () => {
      const receiverId = 'user-2';
      const message = new IncomingMessageDto(
        'msg-123',
        'user-1',
        'Hello',
        Date.now(),
      );

      connectionManager.getSocketId.mockReturnValue(undefined);

      const result = gateway.sendMessageToUser(receiverId, message);

      expect(result).toBe(false);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  /**
   * isUserOnline 테스트 그룹
   * 사용자의 온라인 상태를 확인하는 기능을 테스트합니다.
   */
  describe('isUserOnline', () => {
    /**
     * 온라인 사용자 확인 테스트
     * - 사용자가 연결되어 있는 경우 true 반환
     */
    it('should return true when user is online', () => {
      const userId = 'user-1';
      connectionManager.isConnected.mockReturnValue(true);

      const result = gateway.isUserOnline(userId);

      expect(connectionManager.isConnected).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

  
  });
});

