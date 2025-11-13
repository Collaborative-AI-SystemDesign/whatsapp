import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
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
}
