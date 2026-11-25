import {
  Body,
  Controller,
  Delete,
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

import { CreateServiceOrderUseCase } from '../../../../application/use-cases/create-service-order.use-case';
import { GetServiceOrdersUseCase } from '../../../../application/use-cases/get-service-orders.use-case';
import { GetServiceOrderDetailUseCase } from '../../../../application/use-cases/get-service-order-detail.use-case';
import { UpdateServiceOrderUseCase } from '../../../../application/use-cases/update-service-order.use-case';
import { ChangeServiceOrderStatusUseCase } from '../../../../application/use-cases/change-service-order-status.use-case';
import { AddServiceItemUseCase } from '../../../../application/use-cases/add-service-item.use-case';
import { RemoveServiceItemUseCase } from '../../../../application/use-cases/remove-service-item.use-case';
import { DeliverServiceOrderUseCase } from '../../../../application/use-cases/deliver-service-order.use-case';
import { GetServiceReceiptUseCase } from '../../../../application/use-cases/get-service-receipt.use-case';

import { CreateServiceOrderHttpDto } from './dto/create-service-order.http-dto';
import { UpdateServiceOrderHttpDto } from './dto/update-service-order.http-dto';
import { ChangeServiceOrderStatusHttpDto } from './dto/change-service-order-status.http-dto';
import { AddServiceItemHttpDto } from './dto/add-service-item.http-dto';
import { DeliverServiceOrderHttpDto } from './dto/deliver-service-order.http-dto';
import { QueryServiceOrdersHttpDto } from './dto/query-service-orders.http-dto';

interface RequestUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  locationId: string | null;
  locationName: string | null;
}

@ApiTags('Servicio Técnico y Taller (M7)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TECNICO, Role.ADMIN)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(
    private readonly createServiceOrderUseCase: CreateServiceOrderUseCase,
    private readonly getServiceOrdersUseCase: GetServiceOrdersUseCase,
    private readonly getServiceOrderDetailUseCase: GetServiceOrderDetailUseCase,
    private readonly updateServiceOrderUseCase: UpdateServiceOrderUseCase,
    private readonly changeServiceOrderStatusUseCase: ChangeServiceOrderStatusUseCase,
    private readonly addServiceItemUseCase: AddServiceItemUseCase,
    private readonly removeServiceItemUseCase: RemoveServiceItemUseCase,
    private readonly deliverServiceOrderUseCase: DeliverServiceOrderUseCase,
    private readonly getServiceReceiptUseCase: GetServiceReceiptUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nueva orden de servicio técnico (estado inicial: RECIBIDO)' })
  @ApiResponse({ status: 201, description: 'Orden creada exitosamente con código OS-XXXXXX' })
  @ApiResponse({ status: 400, description: 'Datos de cliente, equipo o puesto inválidos' })
  @ApiResponse({ status: 403, description: 'Solo TECNICO y ADMIN pueden registrar órdenes' })
  async create(
    @Body() dto: CreateServiceOrderHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.createServiceOrderUseCase.execute(
      {
        ...dto,
        userId: user.id,
        userRole: user.role,
        userLocationId: user.locationId,
        userName: user.name ?? null,
      },
      ipAddress,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar órdenes de servicio con conteos por estado (usar ?status=ENTREGADO para Historial de Servicios Realizados)',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado con countsByStatus' })
  @ApiResponse({ status: 403, description: 'No autorizado para consultar órdenes de servicio' })
  async findAll(@Query() query: QueryServiceOrdersHttpDto, @CurrentUser() user: RequestUser) {
    return this.getServiceOrdersUseCase.execute({
      ...query,
      userRole: user.role,
      userLocationId: user.locationId,
    });
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Obtener comprobante de pago emitido en formato de boleta manual limpia' })
  @ApiResponse({ status: 200, description: 'Boleta de servicio técnico limpia' })
  @ApiResponse({ status: 400, description: 'La orden no ha sido entregada aún' })
  @ApiResponse({ status: 404, description: 'Orden o comprobante no encontrado' })
  async getReceipt(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.getServiceReceiptUseCase.execute(id, user.role, user.locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de una orden por ID o código (OS-XXXXXX)' })
  @ApiResponse({ status: 200, description: 'Detalle de la orden con repuestos y pagos' })
  @ApiResponse({ status: 404, description: 'Orden de servicio no encontrada' })
  async findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.getServiceOrderDetailUseCase.execute(id, user.role, user.locationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de cliente, equipo, diagnóstico o mano de obra' })
  @ApiResponse({ status: 200, description: 'Orden actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Orden en estado terminal (ENTREGADO/CANCELADO)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.updateServiceOrderUseCase.execute(id, dto, user, ipAddress);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de la orden (RECIBIDO -> EN_REPARACION -> LISTO o CANCELADO)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Transición inválida o motivo de cancelación faltante' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeServiceOrderStatusHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.changeServiceOrderStatusUseCase.execute(
      id,
      {
        ...dto,
        userId: user.id,
        userRole: user.role,
        userLocationId: user.locationId,
      },
      ipAddress,
    );
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Agregar repuesto/insumo a la orden (descuenta stock propio o de otro puesto)' })
  @ApiResponse({ status: 201, description: 'Repuesto agregado exitosamente' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente, serie no disponible u orden cerrada' })
  async addItem(
    @Param('id') id: string,
    @Body() dto: AddServiceItemHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.addServiceItemUseCase.execute(
      id,
      {
        ...dto,
        userId: user.id,
        userRole: user.role,
        userLocationId: user.locationId,
      },
      ipAddress,
    );
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Retirar repuesto de la orden y restaurar stock en el puesto de origen' })
  @ApiResponse({ status: 200, description: 'Repuesto retirado y stock restaurado' })
  @ApiResponse({ status: 400, description: 'Orden no activa' })
  @ApiResponse({ status: 404, description: 'Repuesto no encontrado en la orden' })
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.removeServiceItemUseCase.execute(id, itemId, user, ipAddress);
  }

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Cobrar y entregar orden (genera comprobante y pasa a estado ENTREGADO)' })
  @ApiResponse({ status: 200, description: 'Orden cobrada y entregada exitosamente' })
  @ApiResponse({ status: 400, description: 'Monto de pagos no cuadra con el totalAmount de la orden' })
  async deliver(
    @Param('id') id: string,
    @Body() dto: DeliverServiceOrderHttpDto,
    @CurrentUser() user: RequestUser,
    @Ip() ipAddress: string,
  ) {
    return this.deliverServiceOrderUseCase.execute(
      id,
      {
        ...dto,
        userId: user.id,
        userRole: user.role,
        userLocationId: user.locationId,
      },
      ipAddress,
    );
  }
}
