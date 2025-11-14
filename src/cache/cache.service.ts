import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/enums/error-code.enum';
import {
  IUserConnectionCache,
  IMessageInboxCache,
  IMessageCache,
} from '../common/interfaces';

@Injectable()
export class CacheService
  implements
    IUserConnectionCache,
    IMessageInboxCache,
    IMessageCache,
    OnModuleInit,
    OnModuleDestroy
{
  private redis!: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    try {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);

      this.redis = new Redis({
        host,
        port,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      throw new AppException(ErrorCode.CACHE_CONNECTION_ERROR, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  onModuleDestroy(): void {
    try {
      this.redis.disconnect();
      this.logger.log('Redis disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting Redis:', error);
    }
  }

  /**
   * 사용자-서버 연결 매핑 저장
   * Key: ws:connection:{userId}
   * Value: serverId
   * TTL: 1 hour
   */
  async setUserConnection(userId: string, serverId: string): Promise<void> {
    try {
      const key = `ws:connection:${userId}`;
      await this.redis.setex(key, 3600, serverId); // 1 hour TTL
    } catch (error) {
      this.logger.error(`Failed to set user connection for ${userId}:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'setUserConnection',
        userId,
      });
    }
  }

  /**
   * 사용자가 온라인인지 확인
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const key = `ws:connection:${userId}`;
      const serverId = await this.redis.get(key);
      return serverId !== null;
    } catch (error) {
      this.logger.error(`Failed to check if user ${userId} is online:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'isUserOnline',
        userId,
      });
    }
  }

  /**
   * 사용자 연결 정보 삭제
   */
  async removeUserConnection(userId: string): Promise<void> {
    try {
      const key = `ws:connection:${userId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to remove user connection for ${userId}:`,
        error,
      );
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'removeUserConnection',
        userId,
      });
    }
  }

  /**
   * 사용자 서버 ID 조회
   */
  async getUserServerId(userId: string): Promise<string | null> {
    try {
      const key = `ws:connection:${userId}`;
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`Failed to get server ID for ${userId}:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'getUserServerId',
        userId,
      });
    }
  }

  /**
   * 미전달 메시지를 inbox에 추가
   * Key: inbox:{userId}
   * Value: List [messageId1, messageId2, ...]
   * TTL: 1 year
   */
  async addToInbox(userId: string, messageId: string): Promise<void> {
    try {
      const key = `inbox:${userId}`;
      await this.redis.rpush(key, messageId);
      await this.redis.expire(key, 31536000); // 1 year TTL
    } catch (error) {
      this.logger.error(
        `Failed to add message ${messageId} to inbox for ${userId}:`,
        error,
      );
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'addToInbox',
        userId,
        messageId,
      });
    }
  }

  /**
   * inbox에서 모든 미전달 메시지 ID 조회
   */
  async getInbox(userId: string): Promise<string[]> {
    try {
      const key = `inbox:${userId}`;
      return await this.redis.lrange(key, 0, -1);
    } catch (error) {
      this.logger.error(`Failed to get inbox for ${userId}:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'getInbox',
        userId,
      });
    }
  }

  /**
   * inbox 삭제 (모든 메시지 전달 완료 후)
   */
  async clearInbox(userId: string): Promise<void> {
    try {
      const key = `inbox:${userId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to clear inbox for ${userId}:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'clearInbox',
        userId,
      });
    }
  }

  /**
   * inbox에서 특정 메시지 ID 제거
   */
  async removeFromInbox(userId: string, messageId: string): Promise<void> {
    try {
      const key = `inbox:${userId}`;
      await this.redis.lrem(key, 1, messageId);
    } catch (error) {
      this.logger.error(
        `Failed to remove message ${messageId} from inbox for ${userId}:`,
        error,
      );
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'removeFromInbox',
        userId,
        messageId,
      });
    }
  }

  /**
   * 메시지 임시 캐싱
   * Key: msg:{messageId}
   * Value: Hash {senderId, receiverId, content, timestamp}
   * TTL: 24 hours
   */
  async cacheMessage(
    messageId: string,
    data: {
      senderId: string;
      receiverId: string;
      content: string;
      timestamp: string;
    },
  ): Promise<void> {
    try {
      const key = `msg:${messageId}`;
      await this.redis.hset(key, data);
      await this.redis.expire(key, 86400); // 24 hours TTL
    } catch (error) {
      this.logger.error(`Failed to cache message ${messageId}:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'cacheMessage',
        messageId,
      });
    }
  }

  /**
   * 캐시된 메시지 조회
   */
  async getCachedMessage(messageId: string): Promise<{
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: string;
  } | null> {
    try {
      const key = `msg:${messageId}`;
      const data = await this.redis.hgetall(key);

      if (Object.keys(data).length === 0) {
        return null;
      }

      return data as {
        senderId: string;
        receiverId: string;
        content: string;
        timestamp: string;
      };
    } catch (error) {
      this.logger.error(`Failed to get cached message ${messageId}:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'getCachedMessage',
        messageId,
      });
    }
  }

  /**
   * 캐시된 메시지 삭제
   */
  async deleteCachedMessage(messageId: string): Promise<void> {
    try {
      const key = `msg:${messageId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cached message ${messageId}:`, error);
      throw new AppException(ErrorCode.CACHE_OPERATION_FAILED, {
        operation: 'deleteCachedMessage',
        messageId,
      });
    }
  }
}
