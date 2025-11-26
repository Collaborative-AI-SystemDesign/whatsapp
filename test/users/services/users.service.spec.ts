/**
 * UsersService 테스트 스위트
 *
 * 이 테스트는 사용자 서비스의 비즈니스 로직을 검증합니다.
 * - 사용자 생성 (트랜잭션 적용)
 * - 사용자 조회
 * - 사용자 업데이트 (트랜잭션 적용)
 * - 사용자 삭제
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../src/users/services/users.service';
import { UserRepository } from '../../../src/users/repositories/user.repository';
import { PrismaService } from '../../../src/prisma/prisma.service';
import type { CreateUserDto } from '../../../src/users/dto/create-user.dto';
import type { UpdateUserDto } from '../../../src/users/dto/update-user.dto';
import type { User } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<UserRepository>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockTransactionClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    const mockPrismaService = {
      executeTransaction: jest.fn(),
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(UserRepository);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    /**
     * 정상적인 사용자 생성 테스트 (트랜잭션)
     * - username 중복 체크
     * - email 중복 체크
     * - 사용자 생성
     */
    it('should create user successfully within transaction', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
      };

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique
          .mockResolvedValueOnce(null) // username 중복 체크 통과
          .mockResolvedValueOnce(null); // email 중복 체크 통과
        tx.user.create.mockResolvedValue(mockUser);
        return callback(tx as any);
      });

      const result = await service.createUser(createUserDto);

      expect(prismaService.executeTransaction).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    /**
     * 트랜잭션 내 username 중복 체크 실패 테스트
     */
    it('should throw ConflictException when username already exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'existinguser',
        email: 'test@example.com',
      };

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique.mockResolvedValueOnce(mockUser); // username 중복 발견
        return callback(tx as any);
      });

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createUser(createUserDto)).rejects.toThrow(
        'Username already exists',
      );
    });

    /**
     * 트랜잭션 내 email 중복 체크 실패 테스트
     */
    it('should throw ConflictException when email already exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'existing@example.com',
      };

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique
          .mockResolvedValueOnce(null) // username 중복 체크 통과
          .mockResolvedValueOnce(mockUser); // email 중복 발견
        return callback(tx as any);
      });

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createUser(createUserDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    /**
     * 트랜잭션 롤백 테스트: 중복 체크 후 생성 실패 시 롤백
     */
    it('should rollback transaction when user creation fails', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
      };
      const dbError = new Error('Database error');

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        tx.user.create.mockRejectedValue(dbError);
        return callback(tx as any);
      });

      await expect(service.createUser(createUserDto)).rejects.toThrow(dbError);
      expect(prismaService.executeTransaction).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    /**
     * 정상적인 사용자 업데이트 테스트 (트랜잭션)
     * - 사용자 존재 확인
     * - email 중복 체크
     * - 사용자 업데이트
     */
    it('should update user successfully within transaction', async () => {
      const userId = 'user-1';
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique
          .mockResolvedValueOnce(mockUser) // 사용자 존재 확인
          .mockResolvedValueOnce(null); // email 중복 체크 통과
        tx.user.update.mockResolvedValue(updatedUser);
        return callback(tx as any);
      });

      const result = await service.updateUser(userId, updateUserDto);

      expect(prismaService.executeTransaction).toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });

    /**
     * 트랜잭션 내 사용자 존재 확인 실패 테스트
     */
    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent';
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique.mockResolvedValueOnce(null); // 사용자 없음
        return callback(tx as any);
      });

      await expect(service.updateUser(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    /**
     * 트랜잭션 내 email 중복 체크 실패 테스트
     */
    it('should throw ConflictException when email already exists for another user', async () => {
      const userId = 'user-1';
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com',
      };
      const otherUser = { ...mockUser, id: 'user-2' };

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique
          .mockResolvedValueOnce(mockUser) // 사용자 존재 확인
          .mockResolvedValueOnce(otherUser); // 다른 사용자가 이미 사용 중인 email
        return callback(tx as any);
      });

      await expect(service.updateUser(userId, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateUser(userId, updateUserDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    /**
     * 트랜잭션 롤백 테스트: 업데이트 실패 시 롤백
     */
    it('should rollback transaction when user update fails', async () => {
      const userId = 'user-1';
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const dbError = new Error('Database error');

      prismaService.executeTransaction.mockImplementation(async (callback) => {
        const tx = mockTransactionClient;
        tx.user.findUnique
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(null);
        tx.user.update.mockRejectedValue(dbError);
        return callback(tx as any);
      });

      await expect(service.updateUser(userId, updateUserDto)).rejects.toThrow(
        dbError,
      );
      expect(prismaService.executeTransaction).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-1');

      expect(userRepository.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getUserById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      userRepository.findAll.mockResolvedValue(users);

      const result = await service.getAllUsers();

      expect(userRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue(mockUser);

      await service.deleteUser('user-1');

      expect(userRepository.findById).toHaveBeenCalledWith('user-1');
      expect(userRepository.delete).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.deleteUser('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      userRepository.exists.mockResolvedValue(true);

      const result = await service.userExists('user-1');

      expect(userRepository.exists).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      userRepository.exists.mockResolvedValue(false);

      const result = await service.userExists('non-existent');

      expect(result).toBe(false);
    });
  });
});
