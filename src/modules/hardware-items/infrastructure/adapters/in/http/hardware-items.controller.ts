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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../../../auth/infrastructure/adapters/in/http/decorators/current-user.decorator';
import { Roles } from '../../../../../auth/infrastructure/adapters/in/http/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/roles.guard';
import { CreateHardwareItemUseCase } from '../../../../application/use-cases/create-hardware-item.use-case';
import { ValidateSerialsUseCase } from '../../../../application/use-cases/validate-serials.use-case';
import { GetHardwareItemsUseCase } from '../../../../application/use-cases/get-hardware-items.use-case';
import { GetAvailableSerialsUseCase } from '../../../../application/use-cases/get-available-serials.use-case';
import { ScanHardwareItemUseCase } from '../../../../application/use-cases/scan-hardware-item.use-case';
import { GetHardwareItemDetailUseCase } from '../../../../application/use-cases/get-hardware-item-detail.use-case';
import { GetHardwareLifecycleUseCase } from '../../../../application/use-cases/get-hardware-lifecycle.use-case';
import { GetBarcodeLabelUseCase } from '../../../../application/use-cases/get-barcode-label.use-case';
import { GetBatchBarcodeLabelsUseCase } from '../../../../application/use-cases/get-batch-barcode-labels.use-case';
import { UpdateHardwareItemUseCase } from '../../../../application/use-cases/update-hardware-item.use-case';
import { DecommissionHardwareItemUseCase } from '../../../../application/use-cases/decommission-hardware-item.use-case';
import { ApproveUsedComponentUseCase } from '../../../../application/use-cases/approve-used-component.use-case';
import { CreateHardwareItemHttpDto } from './dto/create-hardware-item.http-dto';
import { ValidateSerialsHttpDto } from './dto/validate-serials.http-dto';
import { DecommissionHardwareHttpDto } from './dto/decommission-hardware.http-dto';
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
    private readonly createHardwareItemUseCase: CreateHardwareItemUseCase,
    private readonly validateSerialsUseCase: ValidateSerialsUseCase,
    private readonly getHardwareItemsUseCase: GetHardwareItemsUseCase,
    private readonly getAvailableSerialsUseCase: GetAvailableSerialsUseCase,
    private readonly scanHardwareItemUseCase: ScanHardwareItemUseCase,
    private readonly getHardwareItemDetailUseCase: GetHardwareItemDetailUseCase,
    private readonly getHardwareLifecycleUseCase: GetHardwareLifecycleUseCase,
    private readonly getBarcodeLabelUseCase: GetBarcodeLabelUseCase,
    private readonly getBatchBarcodeLabelsUseCase: GetBatchBarcodeLabelsUseCase,
    private readonly updateHardwareItemUseCase: UpdateHardwareItemUseCase,
    private readonly decommissionHardwareItemUseCase: DecommissionHardwareItemUseCase,
    private readonly approveUsedComponentUseCase: ApproveUsedComponentUseCase,
  ) {}

  @Post('validate-serials')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Validar si los números de serie ya existen en la base de datos (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 200, description: 'Resultado de validación de seriales' })
  async validateSerials(@Body() dto: ValidateSerialsHttpDto) {
    return this.validateSerialsUseCase.execute(dto);
  }

  @Post('barcode-labels/batch')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
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
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Aprobar componente de segunda mano e incorporarlo formalmente a stock (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 200, description: 'Componente usado aprobado y vinculado a catálogo de segunda mano' })
  async approveUsed(
    @Body() dto: ApproveUsedComponentHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.approveUsedComponentUseCase.execute(dto, user?.id, ipAddress);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Alta individual de ítem serializado (ADMIN o ENCARGADO_ALMACEN)' })
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
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Scanner-First: Búsqueda rápida por número de serie o código de barras 1D' })
  @ApiResponse({ status: 200, description: 'Ítem encontrado con su ubicación y estado' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async scan(@Param('code') code: string) {
    return this.scanHardwareItemUseCase.execute(code);
  }

  @Get('available-serials')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Consultar números de serie en stock de un catálogo para distribución o venta' })
  @ApiQuery({ name: 'catalogId', required: true, description: 'UUID del producto maestro' })
  @ApiQuery({ name: 'locationId', required: false, description: 'UUID de la ubicación (opcional, por defecto Almacén Central)' })
  @ApiResponse({ status: 200, description: 'Lista de series en estado EN_STOCK' })
  async getAvailableSerials(
    @Query('catalogId', new ParseUUIDPipe({ version: '4' })) catalogId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.getAvailableSerialsUseCase.execute({ catalogId, locationId });
  }

  @Get()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Listar ítems serializados con filtros avanzados' })
  @ApiResponse({ status: 200, description: 'Lista paginada de hardware' })
  async findAll(@Query() query: QueryHardwareItemsHttpDto) {
    return this.getHardwareItemsUseCase.execute(query);
  }

  @Get(':id/lifecycle')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Hoja de Vida de Hardware (M6): Línea de tiempo completa de eventos de bitácora' })
  @ApiResponse({ status: 200, description: 'Historial de auditoría del hardware' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async getLifecycle(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.getHardwareLifecycleUseCase.execute(id);
  }

  @Get(':id/barcode-label')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
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
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Detalle de un hardware ítem con su ubicación y catálogo' })
  @ApiResponse({ status: 200, description: 'Detalle del hardware' })
  @ApiResponse({ status: 404, description: 'Hardware no encontrado' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.getHardwareItemDetailUseCase.execute(id);
  }

  @Patch(':id/decommission')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Dar de baja lógica un ítem serializado con motivo (ADMIN o ENCARGADO_ALMACEN)' })
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

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Actualizar precios, ubicación o estado de un hardware (ADMIN o ENCARGADO_ALMACEN)' })
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
