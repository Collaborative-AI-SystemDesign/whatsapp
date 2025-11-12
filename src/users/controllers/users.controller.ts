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
   *
   * @returns SuccessResponse<User>
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  /**
   * 모든 사용자 조회
   * GET /users
   *
   * @returns SuccessResponse<User[]>
   */
  @Get()
  async findAll() {
    return this.usersService.getAllUsers();
  }

  /**
   * ID로 사용자 조회
   * GET /users/:id
   *
   * @returns SuccessResponse<User>
   */
  @Get(':id')
  async findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.usersService.getUserById(id);
  }

  /**
   * 사용자 정보 부분 업데이트
   * PATCH /users/:id
   *
   * @returns SuccessResponse<User>
   */
  @Patch(':id')
  async update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  /**
   * 사용자 삭제
   * DELETE /users/:id
   *
   * @returns SuccessResponse<{ message: string }>
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', MongoIdValidationPipe) id: string) {
    await this.usersService.deleteUser(id);
    return { message: 'User deleted successfully' };
  }
}
