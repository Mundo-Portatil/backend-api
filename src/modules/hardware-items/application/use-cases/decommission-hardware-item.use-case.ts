import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import { QUANTITY_STOCK_REPOSITORY } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { DecommissionHardwareCommandDto } from '../dto/decommission-hardware-command.dto';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class DecommissionHardwareItemUseCase {
  constructor(
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
    id: string,
    dto: DecommissionHardwareCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<HardwareItemResponseDto> {
    const existing = await this.hardwareItemRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Hardware item with ID "${id}" not found`);
    }

    if (existing.status === 'VENDIDO') {
      throw new BadRequestException('Cannot decommission an item that has already been sold');
    }
    if (existing.status === 'DE_BAJA') {
      throw new BadRequestException('Hardware item is already decommissioned');
    }

    const wasInStock = existing.status === 'EN_STOCK';
    const decommissioned = existing.decommission(dto.reason);

    const saved = await this.transactionManager.runInTransaction(async (tx) => {
      if (wasInStock) {
        await this.quantityStockRepository.upsert(
          existing.catalogId,
          existing.locationId,
          -1,
          undefined,
          undefined,
          tx,
        );
      }
      return this.hardwareItemRepository.update(decommissioned, tx);
    });

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'DECOMMISSION_HARDWARE_ITEM',
      module: 'hardware-items',
      payload: {
        id: saved.id,
        serialNumber: saved.serialNumber,
        reason: dto.reason,
        stockDecremented: wasInStock,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      serialNumber: saved.serialNumber,
      catalogId: saved.catalogId,
      locationId: saved.locationId,
      status: saved.status,
      parentChassisId: saved.parentChassisId,
      costPrice: saved.costPrice,
      salePrice: saved.salePrice,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
