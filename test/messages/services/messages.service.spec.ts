/**
 * MessagesService 테스트 스위트
 * 
 * 이 테스트는 메시지 서비스의 비즈니스 로직을 검증합니다.
 * - 메시지 생성 및 고유 ID 생성
 * - 메시지 조회 (ID, 미전달 메시지)
 * - 메시지 상태 업데이트 (전달 완료, 읽음)
 * - 채팅 히스토리 조회 (페이지네이션)
 * - 오래된 메시지 삭제
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MessagesService } from '../../../src/messages/services/messages.service';
import type { MessageDocument } from '../../../src/messages/schemas/message.schema';
import { Message } from '../../../src/messages/schemas/message.schema';
import { AppException } from '../../../src/common/exceptions/app.exception';
import { ErrorCode } from '../../../src/common/enums/error-code.enum';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageModel: jest.Mocked<Model<MessageDocument>>;

  const mockMessageDocument = {
    messageId: 'msg-123',
    senderId: 'user-1',
    receiverId: 'user-2',
    content: 'Test message',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    undelivered: true,
    deliveredAt: null,
    readAt: null,
    save: jest.fn(),
  } as unknown as MessageDocument;

  const mockMessageModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    // messageModel은 모킹 객체로 주입되지만 직접 사용하지 않음
    // MessagesService가 내부적으로 사용함

    // Reset all mocks
    jest.clearAllMocks();
  });


  describe('createMessage', () => {
    it('should create a new message', async () => {
      const senderId = 'user-1';
      const receiverId = 'user-2';
      const content = 'Test message';
      const timestamp = new Date('2024-01-01T00:00:00Z');

      mockMessageModel.create.mockResolvedValue(mockMessageDocument);

      const result = await service.createMessage(
        senderId,
        receiverId,
        content,
        timestamp,
      );

      expect(mockMessageModel.create).toHaveBeenCalledWith({
        messageId: expect.any(String),
        senderId,
        receiverId,
        content,
        timestamp,
        undelivered: true,
      });
      expect(result).toBe(mockMessageDocument);
    });

  });

  describe('findByMessageId', () => {
    it('should return message when found', async () => {
      const messageId = 'msg-123';
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMessageDocument),
      };
      mockMessageModel.findOne.mockReturnValue(mockQuery as any);

      const result = await service.findByMessageId(messageId);

      expect(mockMessageModel.findOne).toHaveBeenCalledWith({ messageId });
      expect(result).toBe(mockMessageDocument);
    });

    it('should throw AppException when message not found', async () => {
      const messageId = 'non-existent';
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockMessageModel.findOne.mockReturnValue(mockQuery as any);

      await expect(service.findByMessageId(messageId)).rejects.toThrow(
        AppException,
      );
      await expect(service.findByMessageId(messageId)).rejects.toMatchObject({
        errorCode: ErrorCode.MESSAGE_NOT_FOUND,
      });
    });
  });

  describe('findUndeliveredMessages', () => {
    it('should return undelivered messages for receiver', async () => {
      const receiverId = 'user-2';
      const mockMessages = [mockMessageDocument];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      };
      mockMessageModel.find.mockReturnValue(mockQuery as any);

      const result = await service.findUndeliveredMessages(receiverId);

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        receiverId,
        undelivered: true,
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: 1 });
      expect(result).toBe(mockMessages);
    });

  });

  describe('markAsDelivered', () => {
    it('should mark message as delivered', async () => {
      const messageId = 'msg-123';
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ acknowledged: true }),
      };
      mockMessageModel.updateOne.mockReturnValue(mockQuery as any);

      await service.markAsDelivered(messageId);

      expect(mockMessageModel.updateOne).toHaveBeenCalledWith(
        { messageId },
        {
          undelivered: false,
          deliveredAt: expect.any(Date),
        },
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const messageId = 'msg-123';
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ acknowledged: true }),
      };
      mockMessageModel.updateOne.mockReturnValue(mockQuery as any);

      await service.markAsRead(messageId);

      expect(mockMessageModel.updateOne).toHaveBeenCalledWith(
        { messageId },
        { readAt: expect.any(Date) },
      );
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history between two users', async () => {
      const userId = 'user-1';
      const chatParticipantId = 'user-2';
      const mockMessages = [mockMessageDocument];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      };
      mockMessageModel.find.mockReturnValue(mockQuery as any);

      const result = await service.getChatHistory(
        userId,
        chatParticipantId,
        undefined,
        50,
      );

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { senderId: userId, receiverId: chatParticipantId },
          { senderId: chatParticipantId, receiverId: userId },
        ],
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(result).toBe(mockMessages);
    });

    it('should filter by lastTimestamp when provided', async () => {
      const userId = 'user-1';
      const chatParticipantId = 'user-2';
      const lastTimestamp = new Date('2024-01-01T00:00:00Z');
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockMessageModel.find.mockReturnValue(mockQuery as any);

      await service.getChatHistory(userId, chatParticipantId, lastTimestamp);

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { senderId: userId, receiverId: chatParticipantId },
          { senderId: chatParticipantId, receiverId: userId },
        ],
        timestamp: { $lt: lastTimestamp },
      });
    });

  });

  describe('deleteOldMessages', () => {
    it('should delete messages older than specified days', async () => {
      const days = 30;
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 5 }),
      };
      mockMessageModel.deleteMany.mockReturnValue(mockQuery as any);

      await service.deleteOldMessages(days);

      const cutoffDate = expect.any(Date);
      expect(mockMessageModel.deleteMany).toHaveBeenCalledWith({
        undelivered: false,
        deliveredAt: { $lt: cutoffDate },
      });
    });
  });

  describe('markAsUndelivered', () => {
    /**
     * 보상 트랜잭션용: 메시지를 미전달 상태로 되돌림 테스트
     */
    it('should revert message to undelivered status', async () => {
      const messageId = 'msg-123';
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ acknowledged: true }),
      };
      mockMessageModel.updateOne.mockReturnValue(mockQuery as any);

      await service.markAsUndelivered(messageId);

      expect(mockMessageModel.updateOne).toHaveBeenCalledWith(
        { messageId },
        {
          $unset: { deliveredAt: '' },
          undelivered: true,
        },
      );
    });
  });

  describe('deleteByMessageId', () => {
    /**
     * 보상 트랜잭션용: 메시지 ID로 메시지 삭제 테스트
     */
    it('should delete message by messageId', async () => {
      const messageId = 'msg-123';
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };
      mockMessageModel.deleteOne.mockReturnValue(mockQuery as any);

      await service.deleteByMessageId(messageId);

      expect(mockMessageModel.deleteOne).toHaveBeenCalledWith({ messageId });
    });
  });
});
