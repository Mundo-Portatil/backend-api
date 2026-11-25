import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../../../auth/infrastructure/adapters/in/http/decorators/current-user.decorator';
import { Roles } from '../../../../../auth/infrastructure/adapters/in/http/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/roles.guard';
import { CreateUserUseCase } from '../../../../application/use-cases/create-user.use-case';
import { GetUsersUseCase } from '../../../../application/use-cases/get-users.use-case';
import { UpdateUserUseCase } from '../../../../application/use-cases/update-user.use-case';
import { UpdateOwnProfileUseCase } from '../../../../application/use-cases/update-own-profile.use-case';
import { CreateUserHttpDto } from './dto/create-user.http-dto';
import { UpdateUserHttpDto } from './dto/update-user.http-dto';
import { UpdateOwnProfileHttpDto } from './dto/update-own-profile.http-dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updateOwnProfileUseCase: UpdateOwnProfileUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Body() dto: CreateUserHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.createUserUseCase.execute(dto, user?.id, ipAddress);
  }

  @Get()
  @ApiOperation({ summary: 'List all users (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async findAll() {
    return this.getUsersUseCase.execute();
  }

  @Patch('me')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Update own profile (All authenticated users)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateOwnProfileHttpDto,
    @Ip() ipAddress: string,
  ) {
    return this.updateOwnProfileUseCase.execute(user.id, dto, ipAddress);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing user (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.updateUserUseCase.execute(id, dto, user?.id, ipAddress);
  }
}
