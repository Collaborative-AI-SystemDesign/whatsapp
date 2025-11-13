import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
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
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  /**
   * 사용자-서버 연결 매핑 저장
   * Key: ws:connection:{userId}
   * Value: serverId
   * TTL: 1 hour
   */
  async setUserConnection(userId: string, serverId: string): Promise<void> {
    const key = `ws:connection:${userId}`;
    await this.redis.setex(key, 3600, serverId); // 1 hour TTL
  }

  /**
   * 사용자가 온라인인지 확인
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const key = `ws:connection:${userId}`;
    const serverId = await this.redis.get(key);
    return serverId !== null;
  }

  /**
   * 사용자 연결 정보 삭제
   */
  async removeUserConnection(userId: string): Promise<void> {
    const key = `ws:connection:${userId}`;
    await this.redis.del(key);
  }

  /**
   * 사용자 서버 ID 조회
   */
  async getUserServerId(userId: string): Promise<string | null> {
    const key = `ws:connection:${userId}`;
    return await this.redis.get(key);
  }

  /**
   * 미전달 메시지를 inbox에 추가
   * Key: inbox:{userId}
   * Value: List [messageId1, messageId2, ...]
   * TTL: 1 year
   */
  async addToInbox(userId: string, messageId: string): Promise<void> {
    const key = `inbox:${userId}`;
    await this.redis.rpush(key, messageId);
    await this.redis.expire(key, 31536000); // 1 year TTL
  }

  /**
   * inbox에서 모든 미전달 메시지 ID 조회
   */
  async getInbox(userId: string): Promise<string[]> {
    const key = `inbox:${userId}`;
    return await this.redis.lrange(key, 0, -1);
  }

  /**
   * inbox 삭제 (모든 메시지 전달 완료 후)
   */
  async clearInbox(userId: string): Promise<void> {
    const key = `inbox:${userId}`;
    await this.redis.del(key);
  }

  /**
   * inbox에서 특정 메시지 ID 제거
   */
  async removeFromInbox(userId: string, messageId: string): Promise<void> {
    const key = `inbox:${userId}`;
    await this.redis.lrem(key, 1, messageId);
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
    const key = `msg:${messageId}`;
    await this.redis.hset(key, data);
    await this.redis.expire(key, 86400); // 24 hours TTL
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
    const key = `msg:${messageId}`;
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return data as {
      senderId: string;
      receiverId: string;
      content: string;
      timestamp: string;
    };
  }

  /**
   * 캐시된 메시지 삭제
   */
  async deleteCachedMessage(messageId: string): Promise<void> {
    const key = `msg:${messageId}`;
    await this.redis.del(key);
  }
}
