/**
 * QueueService 테스트 스위트
 * 
 * 이 테스트는 RabbitMQ 큐 서비스의 기능을 검증합니다.
 * - RabbitMQ 연결 초기화 및 종료
 * - 메시지 발행 (publish)
 * - 메시지 소비 (consume)
 * - 메시지 처리 오류 처리
 * - 연결 오류 처리
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { QueueService } from '../../src/queue/queue.service';
import { AppException } from '../../src/common/exceptions/app.exception';
import { ErrorCode } from '../../src/common/enums/error-code.enum';
import type { MessagePayload } from '../../src/common/interfaces/queue.interface';

// Mock amqp-connection-manager
jest.mock('amqp-connection-manager');

describe('QueueService', () => {
  let service: QueueService;
  let configService: jest.Mocked<ConfigService>;
  let mockConnection: jest.Mocked<amqp.AmqpConnectionManager>;
  let mockChannelWrapper: jest.Mocked<amqp.ChannelWrapper>;

  const mockMessagePayload: MessagePayload = {
    messageId: 'msg-123',
    senderId: 'user-1',
    receiverId: 'user-2',
    content: 'Test message',
    timestamp: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockChannelWrapper = {
      sendToQueue: jest.fn().mockResolvedValue(undefined),
      addSetup: jest.fn(),
      waitForConnect: jest.fn(),
      close: jest.fn(),
    } as any;

    mockConnection = {
      createChannel: jest.fn().mockReturnValue(mockChannelWrapper),
      close: jest.fn(),
      on: jest.fn(),
    } as any;

    (amqp.connect as jest.Mock).mockReturnValue(mockConnection);

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'RABBITMQ_URL') return 'amqp://guest:guest@localhost:5672';
        if (key === 'RABBITMQ_QUEUE') return 'chat.messages';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    configService = module.get(ConfigService);

    // Mock config values (for dynamic changes in tests)
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'RABBITMQ_URL') return 'amqp://guest:guest@localhost:5672';
      if (key === 'RABBITMQ_QUEUE') return 'chat.messages';
      return defaultValue;
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize RabbitMQ connection', async () => {
      mockChannelWrapper.waitForConnect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalledWith(
        ['amqp://guest:guest@localhost:5672'],
        {
          heartbeatIntervalInSeconds: 30,
          reconnectTimeInSeconds: 5,
        },
      );
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannelWrapper.waitForConnect).toHaveBeenCalled();
    });


    it('should throw AppException on initialization error', async () => {
      mockChannelWrapper.waitForConnect.mockRejectedValue(
        new Error('Connection failed'),
      );

      await expect(service.onModuleInit()).rejects.toThrow(AppException);
      await expect(service.onModuleInit()).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_CONNECTION_ERROR,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should close connection and channel', async () => {
      mockChannelWrapper.waitForConnect.mockResolvedValue(undefined);
      mockChannelWrapper.close.mockResolvedValue(undefined);
      mockConnection.close.mockResolvedValue(undefined);

      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockChannelWrapper.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('publishMessage', () => {
    beforeEach(async () => {
      mockChannelWrapper.waitForConnect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should publish message to queue', async () => {
      await service.publishMessage(mockMessagePayload);

      expect(mockChannelWrapper.sendToQueue).toHaveBeenCalledWith(
        'chat.messages',
        mockMessagePayload,
        {
          persistent: true,
          contentType: 'application/json',
        },
      );
    });

    it('should throw AppException on publish error', async () => {
      mockChannelWrapper.sendToQueue.mockRejectedValue(
        new Error('Publish failed'),
      );

      await expect(service.publishMessage(mockMessagePayload)).rejects.toThrow(
        AppException,
      );
      await expect(
        service.publishMessage(mockMessagePayload),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_PUBLISH_FAILED,
      });
    });
  });

  describe('consume', () => {
    beforeEach(async () => {
      mockChannelWrapper.waitForConnect.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should setup message consumer', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      const mockChannel = {
        consume: jest.fn(),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      mockChannelWrapper.addSetup.mockImplementation(async (setupFn: any) => {
        await setupFn(mockChannel);
      });

      await service.consume(callback);

      expect(mockChannelWrapper.addSetup).toHaveBeenCalled();
      expect(mockChannel.consume).toHaveBeenCalledWith(
        'chat.messages',
        expect.any(Function),
        { noAck: false },
      );
    });

    it('should process valid message and acknowledge', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      const mockChannel = {
        consume: jest.fn((_queue, handler) => {
          // Simulate message arrival
          const mockMsg = {
            content: Buffer.from(JSON.stringify(mockMessagePayload)),
          };
          handler(mockMsg);
        }),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      mockChannelWrapper.addSetup.mockImplementation(async (setupFn: any) => {
        await setupFn(mockChannel);
      });

      await service.consume(callback);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(mockMessagePayload);
      expect(mockChannel.ack).toHaveBeenCalled();
    });

    it('should reject invalid message', async () => {
      const callback = jest.fn();
      const mockChannel = {
        consume: jest.fn((_queue, handler) => {
          const mockMsg = {
            content: Buffer.from(JSON.stringify({ invalid: 'data' })),
          };
          handler(mockMsg);
        }),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      mockChannelWrapper.addSetup.mockImplementation(async (setupFn: any) => {
        await setupFn(mockChannel);
      });

      await service.consume(callback);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(
        expect.any(Object),
        false,
        true,
      );
    });

    it('should requeue message on callback error', async () => {
      const callback = jest
        .fn()
        .mockRejectedValue(new Error('Processing error'));
      const mockChannel = {
        consume: jest.fn((_queue, handler) => {
          const mockMsg = {
            content: Buffer.from(JSON.stringify(mockMessagePayload)),
          };
          handler(mockMsg);
        }),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      mockChannelWrapper.addSetup.mockImplementation(async (setupFn: any) => {
        await setupFn(mockChannel);
      });

      await service.consume(callback);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.nack).toHaveBeenCalledWith(
        expect.any(Object),
        false,
        true,
      );
    });

    it('should throw AppException on consume setup error', async () => {
      const callback = jest.fn();
      mockChannelWrapper.addSetup.mockRejectedValue(new Error('Setup failed'));

      await expect(service.consume(callback)).rejects.toThrow(AppException);
      await expect(service.consume(callback)).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_CONSUME_FAILED,
      });
    });
  });

});

