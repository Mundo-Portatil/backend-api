import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
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
import { Roles } from '../../../../../auth/infrastructure/adapters/in/http/decorators/roles.decorator';
import { CurrentUser } from '../../../../../auth/infrastructure/adapters/in/http/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/roles.guard';
import { CreateDirectTransferUseCase } from '../../../../application/use-cases/create-direct-transfer.use-case';
import { GetTransfersUseCase } from '../../../../application/use-cases/get-transfers.use-case';
import { GetTransferDetailUseCase } from '../../../../application/use-cases/get-transfer-detail.use-case';
import { CreateDirectTransferHttpDto } from './dto/create-direct-transfer.http-dto';
import { QueryTransfersHttpDto } from './dto/query-transfers.http-dto';

interface RequestUser {
  id: string;
  email: string;
  role: Role;
  locationId: string | null;
  locationName: string | null;
}

@ApiTags('Logística Interna y Traslados (M3)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly createDirectTransferUseCase: CreateDirectTransferUseCase,
    private readonly getTransfersUseCase: GetTransfersUseCase,
    private readonly getTransferDetailUseCase: GetTransferDetailUseCase,
  ) {}

  @Post('direct')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Registrar traslado directo inmediato (Almacén Central <-> Puesto)' })
  @ApiResponse({ status: 201, description: 'Traslado directo completado exitosamente' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente, ubicaciones inválidas o duplicados' })
  @ApiResponse({ status: 403, description: 'Solo ADMIN y ENCARGADO_ALMACEN pueden ejecutar traslados directos' })
  async createDirect(
    @Body() dto: CreateDirectTransferHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.createDirectTransferUseCase.execute(dto, user, ipAddress);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Listar transferencias con filtros y ámbito por puesto' })
  @ApiResponse({ status: 200, description: 'Listado de transferencias' })
  async findAll(
    @Query() query: QueryTransfersHttpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.getTransfersUseCase.execute(query, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Obtener detalle de transferencia por ID o código (TR-XXXXXX)' })
  @ApiResponse({ status: 200, description: 'Detalle de la transferencia con ítems y series' })
  @ApiResponse({ status: 404, description: 'Transferencia no encontrada' })
  @ApiResponse({ status: 403, description: 'No tiene permisos para consultar esta transferencia' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.getTransferDetailUseCase.execute(id, user);
  }
}
