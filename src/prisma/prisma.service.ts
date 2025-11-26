import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private configService: ConfigService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // 개발 환경에서만 자동으로 스키마 푸시
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    const autoSync =
      this.configService.get('PRISMA_AUTO_SYNC', 'false') === 'true';

    if (isDevelopment && autoSync) {
      try {
        console.log('🔄 Auto-syncing Prisma schema...');
        execSync('npx prisma db push --skip-generate', {
          stdio: 'inherit',
          env: process.env,
        });
        console.log('✅ Prisma schema synced');
      } catch (error) {
        console.error('❌ Failed to sync Prisma schema:', error);
      }
    }

    await this.$connect();
  }

  /**
   * 트랜잭션 실행 헬퍼 메서드
   * @param callback 트랜잭션 내에서 실행할 콜백 함수
   * @returns 트랜잭션 결과
   */
  async executeTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(callback, {
      maxWait: 5000, // 최대 대기 시간 (ms)
      timeout: 10000, // 최대 실행 시간 (ms)
    });
  }
}
