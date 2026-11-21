import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CreateCatalogItemUseCase } from '../../../../application/use-cases/create-catalog-item.use-case';
import { GetCatalogItemsUseCase } from '../../../../application/use-cases/get-catalog-items.use-case';
import { GetCatalogItemDetailUseCase } from '../../../../application/use-cases/get-catalog-item-detail.use-case';
import { UpdateCatalogItemUseCase } from '../../../../application/use-cases/update-catalog-item.use-case';
import { CreateCatalogItemHttpDto } from './dto/create-catalog-item.http-dto';
import { QueryCatalogHttpDto } from './dto/query-catalog.http-dto';
import { UpdateCatalogItemHttpDto } from './dto/update-catalog-item.http-dto';

@ApiTags('Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly createCatalogItemUseCase: CreateCatalogItemUseCase,
    private readonly getCatalogItemsUseCase: GetCatalogItemsUseCase,
    private readonly getCatalogItemDetailUseCase: GetCatalogItemDetailUseCase,
    private readonly updateCatalogItemUseCase: UpdateCatalogItemUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Registrar producto maestro en catálogo (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 201, description: 'Producto de catálogo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Categoría inválida o inactiva' })
  @ApiResponse({ status: 409, description: 'El SKU ya existe' })
  async create(
    @Body() dto: CreateCatalogItemHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.createCatalogItemUseCase.execute(dto, user?.id, ipAddress);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Listar productos de catálogo con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de productos de catálogo' })
  async findAll(@Query() query: QueryCatalogHttpDto) {
    return this.getCatalogItemsUseCase.execute(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Detalle de producto maestro con desglose de stock por ubicación' })
  @ApiResponse({ status: 200, description: 'Detalle y resumen de stock por ubicación' })
  @ApiResponse({ status: 404, description: 'Producto de catálogo no encontrado' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.getCatalogItemDetailUseCase.execute(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Actualizar producto maestro de catálogo (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 200, description: 'Producto de catálogo actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Categoría inválida o inactiva' })
  @ApiResponse({ status: 404, description: 'Producto de catálogo no encontrado' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCatalogItemHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.updateCatalogItemUseCase.execute(id, dto, user?.id, ipAddress);
  }
}
