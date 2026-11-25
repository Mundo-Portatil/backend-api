import {
  Body,
  Controller,
  Ip,
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
import { UnifiedInventoryInboundUseCase } from '../../../../application/use-cases/unified-inventory-inbound.use-case';
import { PrintModelBarcodeLabelsUseCase } from '../../../../application/use-cases/print-model-barcode-labels.use-case';
import { UnifiedInboundHttpDto } from './dto/unified-inbound.http-dto';
import { PrintModelBarcodeLabelsHttpDto } from './dto/print-model-barcode-labels.http-dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly unifiedInventoryInboundUseCase: UnifiedInventoryInboundUseCase,
    private readonly printModelBarcodeLabelsUseCase: PrintModelBarcodeLabelsUseCase,
  ) {}

  @Post('inbound')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({
    summary: 'Ingreso unificado de mercadería al Almacén Central (ADMIN o ENCARGADO_ALMACEN)',
    description:
      'Actualiza el saldo global en QuantityStock y crea registros en HardwareItem únicamente si hasSerialNumbers es true.',
  })
  @ApiResponse({ status: 201, description: 'Lote de inventario ingresado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error de validación en cantidades, catálogo o seriales' })
  @ApiResponse({ status: 409, description: 'Número de serie duplicado en lote o en base de datos' })
  async inbound(
    @Body() dto: UnifiedInboundHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.unifiedInventoryInboundUseCase.execute(dto, user?.id, ipAddress);
  }

  @Post('barcode-labels/by-model')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({
    summary: 'Generar lote de etiquetas 1D idénticas por modelo de catálogo',
    description:
      'Genera N copias de etiquetas usando el SKU del modelo como código de barras para productos no serializados o periféricos.',
  })
  @ApiResponse({ status: 200, description: 'Arreglo de etiquetas generadas' })
  @ApiResponse({ status: 404, description: 'Modelo de catálogo no encontrado' })
  async printByModel(
    @Body() dto: PrintModelBarcodeLabelsHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.printModelBarcodeLabelsUseCase.execute(dto, user?.id, ipAddress);
  }
}
