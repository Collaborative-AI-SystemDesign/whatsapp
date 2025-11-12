import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { MongoIdValidationPipe } from '../../common/pipes/mongodb-objectid-validation.pipe';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자 생성
   * POST /users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return {
      status: 'success',
      data: user,
    };
  }

  /**
   * 모든 사용자 조회
   * GET /users
   */
  @Get()
  async findAll() {
    const users = await this.usersService.getAllUsers();
    return {
      status: 'success',
      data: users,
    };
  }

  /**
   * ID로 사용자 조회
   * GET /users/:id
   */
  @Get(':id')
  async findOne(@Param('id', MongoIdValidationPipe) id: string) {
    const user = await this.usersService.getUserById(id);
    return {
      status: 'success',
      data: user,
    };
  }

  /**
   * 사용자 정보 부분 업데이트
   * PATCH /users/:id
   */
  @Patch(':id')
  async update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return {
      status: 'success',
      data: user,
    };
  }

  /**
   * 사용자 삭제
   * DELETE /users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', MongoIdValidationPipe) id: string) {
    await this.usersService.deleteUser(id);
    return {
      status: 'success',
      message: 'User deleted successfully',
    };
  }
}
