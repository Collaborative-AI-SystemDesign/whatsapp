import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * 사용자 생성
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // username 중복 체크
    const existingUser = await this.userRepository.findByUsername(
      createUserDto.username,
    );
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // email 중복 체크
    if (createUserDto.email) {
      const existingEmail = await this.userRepository.findByEmail(
        createUserDto.email,
      );
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    return this.userRepository.create(createUserDto);
  }

  /**
   * ID로 사용자 조회
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * username으로 사용자 조회
   */
  async getUserByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  /**
   * 모든 사용자 조회
   */
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // 사용자 존재 확인
    await this.getUserById(id);

    // email 중복 체크 (변경하는 경우)
    if (updateUserDto.email) {
      const existingEmail = await this.userRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    return this.userRepository.update(id, updateUserDto);
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    await this.userRepository.delete(id);
  }

  /**
   * 사용자 존재 여부 확인
   */
  async userExists(id: string): Promise<boolean> {
    return this.userRepository.exists(id);
  }
}
