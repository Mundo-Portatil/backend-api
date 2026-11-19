import {
  Body,
  Controller,
  Delete,
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
import { BatchInboundHardwareUseCase } from '../../../../application/use-cases/batch-inbound-hardware.use-case';
import { CreateHardwareItemUseCase } from '../../../../application/use-cases/create-hardware-item.use-case';
import { ValidateSerialsUseCase } from '../../../../application/use-cases/validate-serials.use-case';
import { GetHardwareItemsUseCase } from '../../../../application/use-cases/get-hardware-items.use-case';
import { ScanHardwareItemUseCase } from '../../../../application/use-cases/scan-hardware-item.use-case';
import { GetHardwareItemDetailUseCase } from '../../../../application/use-cases/get-hardware-item-detail.use-case';
import { GetHardwareLifecycleUseCase } from '../../../../application/use-cases/get-hardware-lifecycle.use-case';
import { GetBarcodeLabelUseCase } from '../../../../application/use-cases/get-barcode-label.use-case';
import { GetBatchBarcodeLabelsUseCase } from '../../../../application/use-cases/get-batch-barcode-labels.use-case';
import { UpdateHardwareItemUseCase } from '../../../../application/use-cases/update-hardware-item.use-case';
import { DecommissionHardwareItemUseCase } from '../../../../application/use-cases/decommission-hardware-item.use-case';
import { AttachHardwareChildUseCase } from '../../../../application/use-cases/attach-hardware-child.use-case';
import { DetachHardwareChildUseCase } from '../../../../application/use-cases/detach-hardware-child.use-case';
import { ApproveUsedComponentUseCase } from '../../../../application/use-cases/approve-used-component.use-case';
import { BatchInboundHardwareHttpDto } from './dto/batch-inbound-hardware.http-dto';
import { CreateHardwareItemHttpDto } from './dto/create-hardware-item.http-dto';
import { ValidateSerialsHttpDto } from './dto/validate-serials.http-dto';
import { DecommissionHardwareHttpDto } from './dto/decommission-hardware.http-dto';
import { AttachChildrenHttpDto } from './dto/attach-child.http-dto';
import { UpdateHardwareItemHttpDto } from './dto/update-hardware-item.http-dto';
import { QueryHardwareItemsHttpDto } from './dto/query-hardware-items.http-dto';
import { BatchBarcodeLabelsHttpDto } from './dto/batch-barcode-labels.http-dto';
import { ApproveUsedComponentHttpDto } from './dto/approve-used-component.http-dto';

@ApiTags('Hardware Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hardware-items')
export class HardwareItemsController {
  constructor(
    private readonly batchInboundHardwareUseCase: BatchInboundHardwareUseCase,
    private readonly createHardwareItemUseCase: CreateHardwareItemUseCase,
    private readonly validateSerialsUseCase: ValidateSerialsUseCase,
    private readonly getHardwareItemsUseCase: GetHardwareItemsUseCase,
    private readonly scanHardwareItemUseCase: ScanHardwareItemUseCase,
    private readonly getHardwareItemDetailUseCase: GetHardwareItemDetailUseCase,
    private readonly getHardwareLifecycleUseCase: GetHardwareLifecycleUseCase,
    private readonly getBarcodeLabelUseCase: GetBarcodeLabelUseCase,
    private readonly getBatchBarcodeLabelsUseCase: GetBatchBarcodeLabelsUseCase,
    private readonly updateHardwareItemUseCase: UpdateHardwareItemUseCase,
    private readonly decommissionHardwareItemUseCase: DecommissionHardwareItemUseCase,
    private readonly attachHardwareChildUseCase: AttachHardwareChildUseCase,
    private readonly detachHardwareChildUseCase: DetachHardwareChildUseCase,
    private readonly approveUsedComponentUseCase: ApproveUsedComponentUseCase,
  ) {}

  @Post('batch-inbound')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ingreso masivo por lotes con laptops y componentes hijos (Solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Lote ingresado exitosamente en una sola transacción' })
  @ApiResponse({ status: 400, description: 'Ubicación o catálogo inválido' })
  @ApiResponse({ status: 409, description: 'Número de serie duplicado en lote o base de datos' })
  async batchInbound(
    @Body() dto: BatchInboundHardwareHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.batchInboundHardwareUseCase.execute(dto, user?.id, ipAddress);
  }

  @Post('validate-serials')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Validar si los números de serie ya existen en la base de datos (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Resultado de validación de seriales' })
  async validateSerials(@Body() dto: ValidateSerialsHttpDto) {
    return this.validateSerialsUseCase.execute(dto);
  }

  @Post('barcode-labels/batch')
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Obtener etiquetas 1D Code 128 para un lote de hardware' })
  @ApiResponse({ status: 200, description: 'Arreglo de etiquetas formateadas para impresión térmica' })
  async getBatchLabels(
    @Body() dto: BatchBarcodeLabelsHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.getBatchBarcodeLabelsUseCase.execute(dto.hardwareItemIds, user?.id, ipAddress);
  }

  @Post('approve-used')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar componente de segunda mano e incorporarlo formalmente a stock (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Componente usado aprobado y vinculado a catálogo de segunda mano' })
  async approveUsed(
    @Body() dto: ApproveUsedComponentHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.approveUsedComponentUseCase.execute(dto, user?.id, ipAddress);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Alta individual de ítem serializado (Solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Ítem serializado creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El número de serie ya existe' })
  async create(
    @Body() dto: CreateHardwareItemHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.createHardwareItemUseCase.execute(dto, user?.id, ipAddress);
  }

  @Get('scan/:code')
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Scanner-First: Búsqueda rápida por número de serie o código de barras 1D' })
  @ApiResponse({ status: 200, description: 'Ítem encontrado con su ubicación, equipo padre o componentes hijos' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async scan(@Param('code') code: string) {
    return this.scanHardwareItemUseCase.execute(code);
  }

  @Get()
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Listar ítems serializados con filtros avanzados' })
  @ApiResponse({ status: 200, description: 'Lista paginada de hardware' })
  async findAll(@Query() query: QueryHardwareItemsHttpDto) {
    return this.getHardwareItemsUseCase.execute(query);
  }

  @Get(':id/lifecycle')
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Hoja de Vida de Hardware (M6): Línea de tiempo completa de eventos de bitácora' })
  @ApiResponse({ status: 200, description: 'Historial de auditoría del hardware' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async getLifecycle(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.getHardwareLifecycleUseCase.execute(id);
  }

  @Get(':id/barcode-label')
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Obtener datos formateados de etiqueta 1D Code 128 para impresión térmica' })
  @ApiResponse({ status: 200, description: 'Datos de la etiqueta listos para impresión' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async getLabel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.getBarcodeLabelUseCase.execute(id, user?.id, ipAddress);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Detalle de un hardware ítem con su padre e hijos' })
  @ApiResponse({ status: 200, description: 'Detalle del hardware' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.getHardwareItemDetailUseCase.execute(id);
  }

  @Patch(':id/decommission')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Dar de baja lógica un ítem serializado con motivo (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Ítem dado de baja exitosamente' })
  @ApiResponse({ status: 400, description: 'El ítem ya fue vendido o falta el motivo' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async decommission(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: DecommissionHardwareHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.decommissionHardwareItemUseCase.execute(id, dto, user?.id, ipAddress);
  }

  @Post(':id/children')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Acoplar uno o más componentes hijos a un equipo chasis padre (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Componentes acoplados exitosamente' })
  @ApiResponse({ status: 400, description: 'Violación de invariantes (misma ubicación, disponible, sin ciclos)' })
  async attachChildren(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AttachChildrenHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.attachHardwareChildUseCase.execute(id, dto.childIds, user?.id, ipAddress);
  }

  @Delete(':id/children/:childId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desacoplar un componente hijo del equipo chasis padre (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Componente desacoplado exitosamente' })
  @ApiResponse({ status: 400, description: 'El componente no pertenece a este padre' })
  async detachChild(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('childId', new ParseUUIDPipe({ version: '4' })) childId: string,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.detachHardwareChildUseCase.execute(id, childId, user?.id, ipAddress);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar precios, ubicación o estado de un hardware (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Hardware actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateHardwareItemHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.updateHardwareItemUseCase.execute(id, dto, user?.id, ipAddress);
  }
}
