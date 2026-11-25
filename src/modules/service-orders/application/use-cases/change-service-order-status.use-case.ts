import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderRepositoryPort } from '../../domain/ports/out/service-order-repository.port';
import { HARDWARE_ITEM_REPOSITORY } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import { QUANTITY_STOCK_REPOSITORY } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { ChangeServiceOrderStatusCommandDto } from '../dto/change-service-order-status-command.dto';
import type { ServiceOrderDetailResponseDto } from '../dto/service-order-detail-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class ChangeServiceOrderStatusUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(QUANTITY_STOCK_REPOSITORY)
    private readonly quantityStockRepository: QuantityStockRepositoryPort,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    idOrCode: string,
    dto: ChangeServiceOrderStatusCommandDto,
    ipAddress?: string,
  ): Promise<ServiceOrderDetailResponseDto> {
    const order =
      (await this.serviceOrderRepository.findById(idOrCode)) ??
      (await this.serviceOrderRepository.findByCode(idOrCode));

    if (!order) {
      throw new NotFoundException('Orden de servicio técnico no encontrada');
    }

    if (dto.userRole === 'TECNICO' && dto.userLocationId !== order.locationId) {
      throw new ForbiddenException('No tiene permisos para modificar órdenes de otro puesto');
    }

    if (order.status === 'ENTREGADO' || order.status === 'CANCELADO') {
      throw new BadRequestException(`No se puede cambiar el estado de una orden terminal (${order.status})`);
    }

    if (dto.status === 'ENTREGADO') {
      throw new BadRequestException(
        'La orden solo puede pasar a ENTREGADO a través del proceso de cobro y entrega (POST /service-orders/:id/deliver)',
      );
    }

    if (dto.status === 'CANCELADO') {
      if (!dto.cancelReason || !dto.cancelReason.trim()) {
        throw new BadRequestException('Debe proporcionar un motivo para cancelar la orden');
      }

      const saved = await this.transactionManager.runInTransaction(async (tx) => {
        // Revertir inventario de todos los repuestos agregados a la orden
        for (const item of order.items) {
          if (item.hardwareItemId) {
            const hw = await this.hardwareItemRepository.findById(item.hardwareItemId, undefined, tx);
            if (hw) {
              const revertedHw = hw.updateDetails({ status: 'EN_STOCK' });
              await this.hardwareItemRepository.save(revertedHw, tx);
            }
            await this.quantityStockRepository.upsert(
              item.catalogId,
              item.sourceLocationId,
              1,
              undefined,
              undefined,
              tx,
            );

            // Registro en AuditLog para Hoja de Vida
            await this.auditLogPort.record({
              userId: dto.userId,
              action: 'SERVICE_ORDER_CANCELLED',
              module: 'SERVICE_ORDERS',
              payload: {
                orderId: order.id,
                orderCode: order.code,
                hardwareItemId: item.hardwareItemId,
                serialNumber: item.serialNumber,
                sourceLocationId: item.sourceLocationId,
                cancelReason: dto.cancelReason,
              },
              ipAddress,
            });
          } else {
            await this.quantityStockRepository.upsert(
              item.catalogId,
              item.sourceLocationId,
              item.quantity,
              undefined,
              undefined,
              tx,
            );
          }
        }

        const cancelledOrder = order.changeStatus('CANCELADO', dto.cancelReason);
        const resultOrder = await this.serviceOrderRepository.save(cancelledOrder, tx);

        await this.auditLogPort.record({
          userId: dto.userId,
          action: 'SERVICE_ORDER_CANCELLED',
          module: 'SERVICE_ORDERS',
          payload: {
            orderId: order.id,
            orderCode: order.code,
            cancelReason: dto.cancelReason,
          },
          ipAddress,
        });

        return resultOrder;
      });

      return ServiceOrderDtoMapper.toDetailResponseDto(saved);
    }

    // Transición no terminal (RECIBIDO -> EN_REPARACION -> LISTO, etc.)
    try {
      const updatedOrder = order.changeStatus(dto.status);
      const saved = await this.serviceOrderRepository.save(updatedOrder);

      await this.auditLogPort.record({
        userId: dto.userId,
        action: 'SERVICE_ORDER_STATUS_CHANGED',
        module: 'SERVICE_ORDERS',
        payload: {
          orderId: order.id,
          orderCode: order.code,
          previousStatus: order.status,
          newStatus: dto.status,
        },
        ipAddress,
      });

      return ServiceOrderDtoMapper.toDetailResponseDto(saved);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
