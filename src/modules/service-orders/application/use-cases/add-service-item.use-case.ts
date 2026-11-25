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
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { ServiceItemEntity } from '../../domain/entities/service-item.entity';
import type { AddServiceItemCommandDto } from '../dto/add-service-item-command.dto';
import type { ServiceOrderDetailResponseDto } from '../dto/service-order-detail-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class AddServiceItemUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(QUANTITY_STOCK_REPOSITORY)
    private readonly quantityStockRepository: QuantityStockRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    orderIdOrCode: string,
    dto: AddServiceItemCommandDto,
    ipAddress?: string,
  ): Promise<ServiceOrderDetailResponseDto> {
    if (dto.unitPrice < 0) {
      throw new BadRequestException('El precio unitario no puede ser negativo');
    }

    const order =
      (await this.serviceOrderRepository.findById(orderIdOrCode)) ??
      (await this.serviceOrderRepository.findByCode(orderIdOrCode));

    if (!order) {
      throw new NotFoundException('Orden de servicio técnico no encontrada');
    }

    if (dto.userRole === 'TECNICO' && dto.userLocationId !== order.locationId) {
      throw new ForbiddenException('No tiene permisos para modificar órdenes de otro puesto');
    }

    if (order.status === 'ENTREGADO' || order.status === 'CANCELADO') {
      throw new BadRequestException(`No se pueden agregar repuestos a una orden en estado ${order.status}`);
    }

    let sourceLocationId = order.locationId;
    let sourceLocationName = order.locationName;

    if (dto.sourceLocationId) {
      const loc = await this.locationRepository.findById(dto.sourceLocationId);
      if (!loc || !loc.active) {
        throw new NotFoundException('Puesto origen no encontrado o inactivo');
      }
      if (loc.type !== 'PUESTO') {
        throw new BadRequestException('Solo se pueden consumir repuestos desde puestos de atención');
      }
      sourceLocationId = loc.id;
      sourceLocationName = loc.name;
    }

    const isFromOtherPuesto = sourceLocationId !== order.locationId;

    const catalog = await this.catalogRepository.findById(dto.catalogId);
    if (!catalog || !catalog.active) {
      throw new NotFoundException('Producto de catálogo no encontrado o inactivo');
    }

    const savedOrder = await this.transactionManager.runInTransaction(async (tx) => {
      let createdItem: ServiceItemEntity;

      if (dto.hardwareItemId) {
        const hw = await this.hardwareItemRepository.findById(dto.hardwareItemId, undefined, tx);
        if (!hw) {
          throw new NotFoundException('Ítem de hardware serializado no encontrado');
        }
        if (hw.catalogId !== dto.catalogId) {
          throw new BadRequestException('El ítem de hardware no coincide con el producto de catálogo');
        }
        if (hw.locationId !== sourceLocationId) {
          throw new BadRequestException('El ítem no se encuentra en el puesto de origen especificado');
        }
        if (hw.status !== 'EN_STOCK') {
          throw new BadRequestException(`El ítem no está disponible para su uso (estado actual: ${hw.status})`);
        }

        const qStock = await this.quantityStockRepository.findByCatalogAndLocation(
          dto.catalogId,
          sourceLocationId,
          tx,
        );
        if (!qStock || qStock.quantity < 1) {
          throw new BadRequestException('Stock insuficiente en el puesto de origen');
        }

        await this.quantityStockRepository.upsert(dto.catalogId, sourceLocationId, -1, undefined, undefined, tx);
        const soldHw = hw.updateDetails({ status: 'VENDIDO' });
        await this.hardwareItemRepository.save(soldHw, tx);

        createdItem = ServiceItemEntity.create({
          serviceOrderId: order.id,
          catalogId: dto.catalogId,
          hardwareItemId: hw.id,
          sourceLocationId,
          isFromOtherPuesto,
          quantity: 1,
          unitPrice: dto.unitPrice,
          catalogSku: catalog.sku,
          catalogBrand: catalog.brand,
          catalogModel: catalog.model,
          serialNumber: hw.serialNumber,
          sourceLocationName,
        });
      } else {
        const qty = dto.quantity ?? 1;
        if (qty <= 0) {
          throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        const qStock = await this.quantityStockRepository.findByCatalogAndLocation(
          dto.catalogId,
          sourceLocationId,
          tx,
        );
        if (!qStock || qStock.quantity < qty) {
          throw new BadRequestException(
            `Stock insuficiente en el puesto origen. Disponible: ${qStock?.quantity ?? 0}`,
          );
        }

        await this.quantityStockRepository.upsert(dto.catalogId, sourceLocationId, -qty, undefined, undefined, tx);

        createdItem = ServiceItemEntity.create({
          serviceOrderId: order.id,
          catalogId: dto.catalogId,
          hardwareItemId: null,
          sourceLocationId,
          isFromOtherPuesto,
          quantity: qty,
          unitPrice: dto.unitPrice,
          catalogSku: catalog.sku,
          catalogBrand: catalog.brand,
          catalogModel: catalog.model,
          sourceLocationName,
        });
      }

      const savedItem = await this.serviceOrderRepository.addItem(createdItem, tx);
      const updatedOrder = order.addItem(savedItem);
      const resultOrder = await this.serviceOrderRepository.save(updatedOrder, tx);

      await this.auditLogPort.record({
        userId: dto.userId,
        action: 'SERVICE_ORDER_ADD_ITEM',
        module: 'SERVICE_ORDERS',
        payload: {
          orderId: order.id,
          orderCode: order.code,
          catalogId: dto.catalogId,
          hardwareItemId: dto.hardwareItemId ?? null,
          serialNumber: savedItem.serialNumber,
          sourceLocationId,
          sourceLocationName,
          isFromOtherPuesto,
          quantity: savedItem.quantity,
          unitPrice: savedItem.unitPrice,
          subtotal: savedItem.subtotal,
        },
        ipAddress,
      });

      return resultOrder;
    });

    return ServiceOrderDtoMapper.toDetailResponseDto(savedOrder);
  }
}
