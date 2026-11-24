import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
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
import { Roles } from '../../../../../auth/infrastructure/adapters/in/http/decorators/roles.decorator';
import { CurrentUser } from '../../../../../auth/infrastructure/adapters/in/http/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/roles.guard';
import { CreateDirectTransferUseCase } from '../../../../application/use-cases/create-direct-transfer.use-case';
import { CreateTransferUseCase } from '../../../../application/use-cases/create-transfer.use-case';
import { UpdateDraftTransferUseCase } from '../../../../application/use-cases/update-draft-transfer.use-case';
import { DispatchTransferUseCase } from '../../../../application/use-cases/dispatch-transfer.use-case';
import { ConfirmTransferUseCase } from '../../../../application/use-cases/confirm-transfer.use-case';
import { CancelTransferUseCase } from '../../../../application/use-cases/cancel-transfer.use-case';
import { GetTransfersUseCase } from '../../../../application/use-cases/get-transfers.use-case';
import { GetTransferDetailUseCase } from '../../../../application/use-cases/get-transfer-detail.use-case';
import { CreateDirectTransferHttpDto } from './dto/create-direct-transfer.http-dto';
import { CreateTransferHttpDto } from './dto/create-transfer.http-dto';
import { UpdateDraftTransferHttpDto } from './dto/update-draft-transfer.http-dto';
import { ConfirmTransferHttpDto } from './dto/confirm-transfer.http-dto';
import { CancelTransferHttpDto } from './dto/cancel-transfer.http-dto';
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
    private readonly createTransferUseCase: CreateTransferUseCase,
    private readonly updateDraftTransferUseCase: UpdateDraftTransferUseCase,
    private readonly dispatchTransferUseCase: DispatchTransferUseCase,
    private readonly confirmTransferUseCase: ConfirmTransferUseCase,
    private readonly cancelTransferUseCase: CancelTransferUseCase,
    private readonly getTransfersUseCase: GetTransfersUseCase,
    private readonly getTransferDetailUseCase: GetTransferDetailUseCase,
  ) {}

  @Post('direct')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Registrar traslado directo inmediato (Almacén Central <-> Puesto)' })
  @ApiResponse({ status: 201, description: 'Traslado directo completado exitosamente' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente, ubicaciones inválidas o duplicados' })
  @ApiResponse({ status: 403, description: 'Vendedor/técnico intentando operar fuera de su puesto' })
  async createDirect(
    @Body() dto: CreateDirectTransferHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.createDirectTransferUseCase.execute(dto, user, ipAddress);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Crear transferencia entre puestos (DRAFT o EN_TRANSITO)' })
  @ApiResponse({ status: 201, description: 'Transferencia registrada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o ítems duplicados' })
  @ApiResponse({ status: 403, description: 'Intento de originar traslado desde un puesto ajeno' })
  async create(
    @Body() dto: CreateTransferHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.createTransferUseCase.execute(dto, user, ipAddress);
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
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.getTransferDetailUseCase.execute(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Actualizar borrador de transferencia (solo estado DRAFT)' })
  @ApiResponse({ status: 200, description: 'Borrador actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'La transferencia no está en estado DRAFT' })
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateDraftTransferHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.updateDraftTransferUseCase.execute(id, dto, user, ipAddress);
  }

  @Post(':id/dispatch')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Despachar transferencia en borrador (pasa a EN_TRANSITO)' })
  @ApiResponse({ status: 200, description: 'Transferencia despachada y series bloqueadas' })
  @ApiResponse({ status: 400, description: 'Estado inválido o stock insuficiente' })
  async dispatch(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.dispatchTransferUseCase.execute(id, user, ipAddress);
  }

  @Post(':id/confirm')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Confirmar recepción en puesto destino con validación de código de barras' })
  @ApiResponse({ status: 200, description: 'Transferencia completada y stock acreditado en destino' })
  @ApiResponse({ status: 400, description: 'Discrepancia en series escaneadas o estado incorrecto' })
  @ApiResponse({ status: 403, description: 'Usuario no pertenece al puesto destino' })
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmTransferHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.confirmTransferUseCase.execute(id, dto, user, ipAddress);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Cancelar transferencia (con reversión automática si estaba en tránsito)' })
  @ApiResponse({ status: 200, description: 'Transferencia cancelada y existencias restauradas' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar una transferencia completada' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelTransferHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.cancelTransferUseCase.execute(id, dto, user, ipAddress);
  }
}
