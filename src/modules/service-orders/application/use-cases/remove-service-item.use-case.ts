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
import type { ServiceOrderDetailResponseDto } from '../dto/service-order-detail-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class RemoveServiceItemUseCase {
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
    orderIdOrCode: string,
    itemId: string,
    user: { id: string; role: string; locationId?: string | null },
    ipAddress?: string,
  ): Promise<ServiceOrderDetailResponseDto> {
    const order =
      (await this.serviceOrderRepository.findById(orderIdOrCode)) ??
      (await this.serviceOrderRepository.findByCode(orderIdOrCode));

    if (!order) {
      throw new NotFoundException('Orden de servicio técnico no encontrada');
    }

    if (user.role === 'TECNICO' && user.locationId !== order.locationId) {
      throw new ForbiddenException('No tiene permisos para modificar órdenes de otro puesto');
    }

    if (order.status !== 'RECIBIDO' && order.status !== 'EN_REPARACION' && order.status !== 'LISTO') {
      throw new BadRequestException('Solo se pueden retirar repuestos de órdenes activas (RECIBIDO, EN_REPARACION, LISTO)');
    }

    const item = await this.serviceOrderRepository.findItemById(itemId);
    if (!item || item.serviceOrderId !== order.id) {
      throw new NotFoundException('Repuesto no encontrado en la orden');
    }

    const savedOrder = await this.transactionManager.runInTransaction(async (tx) => {
      if (item.hardwareItemId) {
        const hw = await this.hardwareItemRepository.findById(item.hardwareItemId, undefined, tx);
        if (hw) {
          const reverted = hw.updateDetails({ status: 'EN_STOCK' });
          await this.hardwareItemRepository.save(reverted, tx);
        }
        await this.quantityStockRepository.upsert(item.catalogId, item.sourceLocationId, 1, undefined, undefined, tx);

        await this.auditLogPort.record({
          userId: user.id,
          action: 'SERVICE_ORDER_REMOVE_ITEM',
          module: 'SERVICE_ORDERS',
          payload: {
            orderId: order.id,
            orderCode: order.code,
            hardwareItemId: item.hardwareItemId,
            serialNumber: item.serialNumber,
            sourceLocationId: item.sourceLocationId,
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

      await this.serviceOrderRepository.removeItem(itemId, tx);
      const updatedOrder = order.removeItem(itemId);
      const resultOrder = await this.serviceOrderRepository.save(updatedOrder, tx);

      await this.auditLogPort.record({
        userId: user.id,
        action: 'SERVICE_ORDER_REMOVE_ITEM',
        module: 'SERVICE_ORDERS',
        payload: {
          orderId: order.id,
          orderCode: order.code,
          itemId,
          catalogId: item.catalogId,
        },
        ipAddress,
      });

      return resultOrder;
    });

    return ServiceOrderDtoMapper.toDetailResponseDto(savedOrder);
  }
}
