/**
 * PrismaService 테스트 스위트
 *
 * 이 테스트는 Prisma 서비스의 트랜잭션 기능을 검증합니다.
 * - executeTransaction 메서드의 정상 동작
 * - 트랜잭션 롤백 동작
 * - 트랜잭션 타임아웃 처리
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { Prisma, PrismaClient } from '@prisma/client';

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: jest.Mocked<ConfigService>;
  let mockPrismaClient: jest.Mocked<PrismaClient>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    // PrismaClient의 $transaction 메서드를 모킹
    mockPrismaClient = {
      $transaction: jest.fn(),
      $connect: jest.fn(),
      user: {} as any,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    configService = module.get(ConfigService);

    // PrismaService의 $transaction 메서드를 모킹
    (service as any).$transaction = mockPrismaClient.$transaction;

    jest.clearAllMocks();
  });


  describe('executeTransaction', () => {
    /**
     * 정상적인 트랜잭션 실행 테스트
     * - 콜백 함수가 성공적으로 실행됨
     * - 트랜잭션 결과 반환
     */
    it('should execute transaction successfully', async () => {
      const mockResult = { id: '1', name: 'test' };
      const mockCallback = jest.fn().mockResolvedValue(mockResult);

      mockPrismaClient.$transaction.mockImplementation(
        async (callback: any) => {
          const tx = {} as Prisma.TransactionClient;
          return callback(tx);
        },
      );

      const result = await service.executeTransaction(mockCallback);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    /**
     * 트랜잭션 옵션 테스트
     * - maxWait와 timeout 옵션이 올바르게 전달됨
     */
    it('should pass transaction options correctly', async () => {
      const mockCallback = jest.fn().mockResolvedValue('result');

      mockPrismaClient.$transaction.mockResolvedValue('result' as any);

      await service.executeTransaction(mockCallback);

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxWait: 5000,
          timeout: 10000,
        },
      );
    });

    /**
     * 트랜잭션 롤백 테스트
     * - 콜백 함수에서 에러 발생 시 트랜잭션이 롤백됨
     */
    it('should rollback transaction when callback throws error', async () => {
      const mockError = new Error('Transaction failed');
      const mockCallback = jest.fn().mockRejectedValue(mockError);

      mockPrismaClient.$transaction.mockImplementation(
        async (callback: any) => {
          const tx = {} as Prisma.TransactionClient;
          return callback(tx);
        },
      );

      await expect(service.executeTransaction(mockCallback)).rejects.toThrow(
        mockError,
      );

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });


  });
});
