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
import { CreateCompanyUseCase } from '../../../../application/use-cases/create-company.use-case';
import { GetCompaniesUseCase } from '../../../../application/use-cases/get-companies.use-case';
import { UpdateCompanyUseCase } from '../../../../application/use-cases/update-company.use-case';
import { CreateCompanyHttpDto } from './dto/create-company.http-dto';
import { UpdateCompanyHttpDto } from './dto/update-company.http-dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly getCompaniesUseCase: GetCompaniesUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Crear nueva empresa remitente/facturadora' })
  @ApiResponse({ status: 201, description: 'Empresa creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o RUC no tiene 11 dígitos' })
  @ApiResponse({ status: 409, description: 'Ya existe una empresa con ese nombre o RUC' })
  async create(
    @Body() dto: CreateCompanyHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.createCompanyUseCase.execute(dto, user?.id, ipAddress);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Listar empresas remitentes/facturadoras' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Búsqueda por nombre o RUC' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  async findAll(
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
    @Query('search') search?: string,
  ) {
    return this.getCompaniesUseCase.execute({ active, search });
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Actualizar empresa o estado activo (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  @ApiResponse({ status: 409, description: 'Colisión de nombre o RUC con otra empresa' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCompanyHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.updateCompanyUseCase.execute(id, dto, user?.id, ipAddress);
  }
}
