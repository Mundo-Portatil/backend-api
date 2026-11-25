import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../../../auth/infrastructure/adapters/in/http/decorators/current-user.decorator';
import { Roles } from '../../../../../auth/infrastructure/adapters/in/http/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/roles.guard';
import { CreateCategoryUseCase } from '../../../../application/use-cases/create-category.use-case';
import { GetCategoriesUseCase } from '../../../../application/use-cases/get-categories.use-case';
import { UpdateCategoryUseCase } from '../../../../application/use-cases/update-category.use-case';
import { CreateCategoryHttpDto } from './dto/create-category.http-dto';
import { UpdateCategoryHttpDto } from './dto/update-category.http-dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Crear nueva categoría (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con ese nombre' })
  async create(
    @Body() dto: CreateCategoryHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.createCategoryUseCase.execute(dto, user?.id, ipAddress);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Listar categorías con conteo de productos' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de categorías' })
  async findAll(
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ) {
    return this.getCategoriesUseCase.execute(active);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Actualizar categoría o estado activo (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Colisión de nombre con otra categoría' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.updateCategoryUseCase.execute(id, dto, user?.id, ipAddress);
  }
}
