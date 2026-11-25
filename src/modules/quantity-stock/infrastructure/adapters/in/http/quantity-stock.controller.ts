import {
  Body,
  Controller,
  Get,
  Ip,
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
import { InboundQuantityStockUseCase } from '../../../../application/use-cases/inbound-quantity-stock.use-case';
import { AdjustQuantityStockUseCase } from '../../../../application/use-cases/adjust-quantity-stock.use-case';
import { GetQuantityStocksUseCase } from '../../../../application/use-cases/get-quantity-stocks.use-case';
import { InboundQuantityStockHttpDto } from './dto/inbound-quantity-stock.http-dto';
import { AdjustQuantityStockHttpDto } from './dto/adjust-quantity-stock.http-dto';
import { QueryQuantityStockHttpDto } from './dto/query-quantity-stock.http-dto';

@ApiTags('Quantity Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quantity-stock')
export class QuantityStockController {
  constructor(
    private readonly inboundQuantityStockUseCase: InboundQuantityStockUseCase,
    private readonly adjustQuantityStockUseCase: AdjustQuantityStockUseCase,
    private readonly getQuantityStocksUseCase: GetQuantityStocksUseCase,
  ) {}

  @Post('inbound')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Registrar entrada de stock cuantitativo por producto y puesto/almacén (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 201, description: 'Stock ingresado o incrementado exitosamente' })
  @ApiResponse({ status: 400, description: 'Ubicación o catálogo inválido' })
  async inbound(
    @Body() dto: InboundQuantityStockHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.inboundQuantityStockUseCase.execute(dto, user?.id, ipAddress);
  }

  @Patch('adjust')
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)
  @ApiOperation({ summary: 'Ajuste manual de stock por conteo físico o merma con motivo obligatorio (ADMIN o ENCARGADO_ALMACEN)' })
  @ApiResponse({ status: 200, description: 'Stock ajustado exitosamente' })
  @ApiResponse({ status: 400, description: 'Motivo obligatorio, cantidad negativa o producto con series físicas activas' })
  @ApiResponse({ status: 404, description: 'Ubicación o catálogo no encontrado' })
  async adjust(
    @Body() dto: AdjustQuantityStockHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.adjustQuantityStockUseCase.execute(dto, user?.id, ipAddress);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'Listar existencias cuantitativas con filtros y alertas de stock bajo' })
  @ApiResponse({ status: 200, description: 'Lista de existencias cuantitativas' })
  async findAll(@Query() query: QueryQuantityStockHttpDto) {
    return this.getQuantityStocksUseCase.execute(query);
  }
}
