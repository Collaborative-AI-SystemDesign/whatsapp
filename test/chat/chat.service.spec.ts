/**
 * ChatService 테스트 스위트
 * 
 * 이 테스트는 채팅 서비스의 비즈니스 로직을 검증합니다.
 * - 사용자 연결/해제 처리
 * - 메시지 전송 및 큐 발행
 * - 메시지 전달 확인 처리
 * - 오프라인 메시지 조회
 * - 사용자 온라인 상태 확인
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ChatService } from '../../src/chat/chat.service';
import { MessagesService } from '../../src/messages/services/messages.service';
import {
  QUEUE_SERVICE,
  USER_CONNECTION_CACHE,
  MESSAGE_INBOX_CACHE,
} from '../../src/common/constants/injection-tokens';
import type {
  IQueueService,
  IUserConnectionCache,
  IMessageInboxCache,
} from '../../src/common/interfaces';
import { IncomingMessageDto } from '../../src/chat/dto';
import { AppException } from '../../src/common/exceptions/app.exception';
import { ErrorCode } from '../../src/common/enums/error-code.enum';

describe('ChatService', () => {
  let service: ChatService;
  let messagesService: jest.Mocked<MessagesService>;
  let queueService: jest.Mocked<IQueueService>;
  let userConnectionCache: jest.Mocked<IUserConnectionCache>;
  let messageInboxCache: jest.Mocked<IMessageInboxCache>;

  const mockMessageDocument = {
    messageId: 'msg-123',
    senderId: 'user-1',
    receiverId: 'user-2',
    content: 'Test message',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    undelivered: true,
  } as any;

  /**
   * 각 테스트 전에 실행되는 설정
   * - MessagesService, QueueService, UserConnectionCache, MessageInboxCache를 모킹
   * - 모든 의존성을 모킹 객체로 주입하여 실제 외부 서비스와 분리된 테스트 실행
   */
  beforeEach(async () => {
    const mockMessagesService = {
      createMessage: jest.fn(),
      findByMessageId: jest.fn(),
      markAsDelivered: jest.fn(),
    };

    const mockQueueService = {
      publishMessage: jest.fn(),
    };

    const mockUserConnectionCache = {
      setUserConnection: jest.fn(),
      removeUserConnection: jest.fn(),
      isUserOnline: jest.fn(),
      getUserServerId: jest.fn(),
    };

    const mockMessageInboxCache = {
      addToInbox: jest.fn(),
      getInbox: jest.fn(),
      removeFromInbox: jest.fn(),
      clearInbox: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
        {
          provide: QUEUE_SERVICE,
          useValue: mockQueueService,
        },
        {
          provide: USER_CONNECTION_CACHE,
          useValue: mockUserConnectionCache,
        },
        {
          provide: MESSAGE_INBOX_CACHE,
          useValue: mockMessageInboxCache,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    messagesService = module.get(MessagesService);
    queueService = module.get(QUEUE_SERVICE);
    userConnectionCache = module.get(USER_CONNECTION_CACHE);
    messageInboxCache = module.get(MESSAGE_INBOX_CACHE);

    jest.clearAllMocks();
  });

  /**
   * 기본 테스트: ChatService가 정상적으로 생성되는지 확인
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  /**
   * sendMessage 테스트 그룹
   * 메시지 전송 처리를 테스트합니다.
   */
  describe('sendMessage', () => {
    /**
     * 정상적인 메시지 전송 테스트
     * - MessagesService를 통해 메시지 생성
     * - QueueService를 통해 메시지를 큐에 발행
     * - 메시지 ID 반환
     */
    it('should create message and publish to queue', async () => {
      const senderId = 'user-1';
      const receiverId = 'user-2';
      const content = 'Test message';
      const timestamp = new Date('2024-01-01T00:00:00Z');

      messagesService.createMessage.mockResolvedValue(mockMessageDocument);
      queueService.publishMessage.mockResolvedValue(undefined);

      const result = await service.sendMessage(
        senderId,
        receiverId,
        content,
        timestamp,
      );

      expect(messagesService.createMessage).toHaveBeenCalledWith(
        senderId,
        receiverId,
        content,
        timestamp,
      );
      expect(queueService.publishMessage).toHaveBeenCalledWith({
        messageId: mockMessageDocument.messageId,
        senderId,
        receiverId,
        content,
        timestamp: timestamp.toISOString(),
      });
      expect(result).toBe(mockMessageDocument.messageId);
    });
  });

  /**
   * markMessageAsDelivered 테스트 그룹
   * 메시지 전달 확인 처리를 테스트합니다.
   */
  describe('markMessageAsDelivered', () => {
    /**
     * 정상적인 메시지 전달 확인 처리 테스트
     * - MessagesService를 통해 메시지를 전달 완료로 표시
     * - MessageInboxCache에서 메시지 제거
     */
    it('should mark message as delivered and remove from inbox', async () => {
      const userId = 'user-2';
      const messageId = 'msg-123';

      messagesService.markAsDelivered.mockResolvedValue(undefined);
      messageInboxCache.removeFromInbox.mockResolvedValue(undefined);

      await service.markMessageAsDelivered(userId, messageId);

      expect(messagesService.markAsDelivered).toHaveBeenCalledWith(messageId);
      expect(messageInboxCache.removeFromInbox).toHaveBeenCalledWith(
        userId,
        messageId,
      );
    });
  });

  /**
   * getOfflineMessages 테스트 그룹
   * 오프라인 메시지 조회를 테스트합니다.
   */
  describe('getOfflineMessages', () => {
    /**
     * 오프라인 메시지가 없는 경우 테스트
     * - 빈 배열 반환
     */
    it('should return empty array when no offline messages', async () => {
      const userId = 'user-1';

      messageInboxCache.getInbox.mockResolvedValue([]);

      const result = await service.getOfflineMessages(userId);

      expect(messageInboxCache.getInbox).toHaveBeenCalledWith(userId);
      expect(result).toEqual([]);
    });

    /**
     * 오프라인 메시지 조회 테스트
     * - MessageInboxCache에서 메시지 ID 목록 조회
     * - 각 메시지 ID로 MessagesService를 통해 메시지 상세 정보 조회
     * - IncomingMessageDto 배열로 반환
     */
    it('should return offline messages from inbox', async () => {
      const userId = 'user-1';
      const messageIds = ['msg-1', 'msg-2'];
      const messages = [
        {
          ...mockMessageDocument,
          messageId: 'msg-1',
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
          ...mockMessageDocument,
          messageId: 'msg-2',
          timestamp: new Date('2024-01-02T00:00:00Z'),
        },
      ];

      messageInboxCache.getInbox.mockResolvedValue(messageIds);
      messagesService.findByMessageId
        .mockResolvedValueOnce(messages[0])
        .mockResolvedValueOnce(messages[1]);

      const result = await service.getOfflineMessages(userId);

      expect(messageInboxCache.getInbox).toHaveBeenCalledWith(userId);
      expect(messagesService.findByMessageId).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(IncomingMessageDto);
      expect(result[0].message_id).toBe('msg-1');
    });

    /**
     * 개별 메시지 조회 오류 처리 테스트
     * - 일부 메시지를 찾을 수 없는 경우
     * - 찾을 수 있는 메시지만 반환하고 오류는 무시
     */
    it('should handle errors when fetching individual messages', async () => {
      const userId = 'user-1';
      const messageIds = ['msg-1', 'msg-2'];

      messageInboxCache.getInbox.mockResolvedValue(messageIds);
      messagesService.findByMessageId
        .mockResolvedValueOnce({
          ...mockMessageDocument,
          messageId: 'msg-1',
        })
        .mockRejectedValueOnce(new AppException(ErrorCode.MESSAGE_NOT_FOUND));

      const result = await service.getOfflineMessages(userId);

      expect(result).toHaveLength(1);
      expect(result[0].message_id).toBe('msg-1');
    });
  });

});
