/**
 * CacheService 테스트 스위트
 * 
 * 이 테스트는 Redis 캐시 서비스의 기능을 검증합니다.
 * - Redis 연결 초기화 및 종료
 * - 사용자 연결 정보 캐싱 (온라인 상태 관리)
 * - 메시지 인박스 관리 (오프라인 메시지)
 * - 메시지 데이터 캐싱
 * - 오류 처리 및 예외 상황 처리
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from '../../src/cache/cache.service';
import { AppException } from '../../src/common/exceptions/app.exception';
import { ErrorCode } from '../../src/common/enums/error-code.enum';

// Mock ioredis
jest.mock('ioredis');

describe('CacheService', () => {
  let service: CacheService;
  let configService: jest.Mocked<ConfigService>;
  let mockRedis: jest.Mocked<Redis>;

  /**
   * 각 테스트 전에 실행되는 설정
   * - Redis 인스턴스를 모킹하여 실제 Redis 서버 없이 테스트
   * - ConfigService를 모킹하여 환경 변수 설정
   */
  beforeEach(async () => {
    // Create mock Redis instance
    mockRedis = {
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      rpush: jest.fn(),
      expire: jest.fn(),
      lrange: jest.fn(),
      lrem: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
      () => mockRedis,
    );

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get(ConfigService);

    // Mock config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return 6379;
      return defaultValue;
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // /**
  //  * 기본 테스트: CacheService가 정상적으로 생성되는지 확인
  //  */
  // it('should be defined', () => {
  //   expect(service).toBeDefined();
  // });

  /**
   * onModuleInit 테스트 그룹
   * Redis 연결 초기화를 테스트합니다.
   */
  describe('onModuleInit', () => {
    /**
     * Redis 연결 초기화 테스트
     * - ConfigService에서 호스트와 포트 정보를 가져와 Redis 연결
     * - 연결 이벤트 리스너 등록
     */
    it('should initialize Redis connection', () => {
      service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        retryStrategy: expect.any(Function),
      });
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
    });

  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis', () => {
      service.onModuleInit();
      service.onModuleDestroy();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });

  /**
   * setUserConnection 테스트 그룹
   * 사용자 연결 정보를 Redis에 저장하는 기능을 테스트합니다.
   */
  describe('setUserConnection', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    /**
     * 사용자 연결 정보 저장 테스트
     * - TTL(Time To Live)과 함께 연결 정보 저장
     * - 키 형식: ws:connection:{userId}
     * - TTL: 3600초 (1시간)
     */
    it('should set user connection with TTL', async () => {
      const userId = 'user-1';
      const serverId = 'server-1';

      mockRedis.setex.mockResolvedValue('OK');

      await service.setUserConnection(userId, serverId);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `ws:connection:${userId}`,
        3600,
        serverId,
      );
    });

    it('should throw AppException on error', async () => {
      const userId = 'user-1';
      const serverId = 'server-1';

      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.setUserConnection(userId, serverId)).rejects.toThrow(
        AppException,
      );

      await expect(
        service.setUserConnection(userId, serverId),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.CACHE_OPERATION_FAILED,
      });
    });
  });

  /**
   * isUserOnline 테스트 그룹
   * 사용자의 온라인 상태를 확인하는 기능을 테스트합니다.
   */
  describe('isUserOnline', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    /**
     * 온라인 사용자 확인 테스트
     * - Redis에 연결 정보가 있는 경우 true 반환
     */
    it('should return true when user is online', async () => {
      const userId = 'user-1';

      mockRedis.get.mockResolvedValue('server-1');

      const result = await service.isUserOnline(userId);

      expect(mockRedis.get).toHaveBeenCalledWith(`ws:connection:${userId}`);
      expect(result).toBe(true);
    });


  });


  /**
   * addToInbox 테스트 그룹
   * 사용자의 인박스에 메시지 ID를 추가하는 기능을 테스트합니다.
   */
  describe('addToInbox', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    /**
     * 인박스에 메시지 추가 테스트
     * - Redis 리스트에 메시지 ID 추가
     * - TTL 설정 (31536000초 = 1년)
     * - 키 형식: inbox:{userId}
     */
    it('should add message to inbox with TTL', async () => {
      const userId = 'user-1';
      const messageId = 'msg-123';

      mockRedis.rpush.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await service.addToInbox(userId, messageId);

      expect(mockRedis.rpush).toHaveBeenCalledWith(
        `inbox:${userId}`,
        messageId,
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `inbox:${userId}`,
        31536000,
      );
    });


  });

  /**
   * getInbox 테스트 그룹
   * 사용자의 인박스에서 모든 메시지 ID를 조회하는 기능을 테스트합니다.
   */
  describe('getInbox', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    /**
     * 인박스의 모든 메시지 ID 조회 테스트
     * - Redis 리스트에서 모든 메시지 ID 반환
     */
    it('should return all message IDs from inbox', async () => {
      const userId = 'user-1';
      const messageIds = ['msg-1', 'msg-2', 'msg-3'];

      mockRedis.lrange.mockResolvedValue(messageIds);

      const result = await service.getInbox(userId);

      expect(mockRedis.lrange).toHaveBeenCalledWith(`inbox:${userId}`, 0, -1);
      expect(result).toEqual(messageIds);
    });


  });


  describe('removeFromInbox', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should remove message from inbox', async () => {
      const userId = 'user-1';
      const messageId = 'msg-123';

      mockRedis.lrem.mockResolvedValue(1);

      await service.removeFromInbox(userId, messageId);

      expect(mockRedis.lrem).toHaveBeenCalledWith(
        `inbox:${userId}`,
        1,
        messageId,
      );
    });
  });

  /**
   * cacheMessage 테스트 그룹
   * 메시지 데이터를 Redis 해시로 캐싱하는 기능을 테스트합니다.
   */
  describe('cacheMessage', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    /**
     * 메시지 캐싱 테스트
     * - Redis 해시로 메시지 데이터 저장
     * - TTL: 86400초 (24시간)
     * - 키 형식: msg:{messageId}
     */
    it('should cache message with TTL', async () => {
      const messageId = 'msg-123';
      const data = {
        senderId: 'user-1',
        receiverId: 'user-2',
        content: 'Test message',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await service.cacheMessage(messageId, data);

      expect(mockRedis.hset).toHaveBeenCalledWith(`msg:${messageId}`, data);
      expect(mockRedis.expire).toHaveBeenCalledWith(`msg:${messageId}`, 86400);
    });
  });

  describe('getCachedMessage', () => {
    beforeEach(() => {
      service.onModuleInit();
    });


    it('should return null when message not cached', async () => {
      const messageId = 'msg-123';

      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.getCachedMessage(messageId);

      expect(result).toBeNull();
    });
  });

});

