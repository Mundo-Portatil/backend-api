import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TRANSFER_REPOSITORY } from '../../domain/ports/out/transfer-repository.port';
import type { TransferRepositoryPort } from '../../domain/ports/out/transfer-repository.port';
import { HARDWARE_ITEM_REPOSITORY } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import { QUANTITY_STOCK_REPOSITORY } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { CancelTransferCommandDto } from '../dto/cancel-transfer-command.dto';
import type { TransferDetailResponseDto } from '../dto/transfer-detail-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class CancelTransferUseCase {
  constructor(
    @Inject(TRANSFER_REPOSITORY)
    private readonly transferRepository: TransferRepositoryPort,
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
    dto: CancelTransferCommandDto,
    user: { id: string; role: Role; locationId: string | null },
    ipAddress?: string,
  ): Promise<TransferDetailResponseDto> {
    const transfer = await this.transferRepository.findById(id);
    if (!transfer) {
      throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    }

    if (transfer.status === 'COMPLETED') {
      throw new BadRequestException('No se puede cancelar una transferencia que ya fue completada');
    }

    if (transfer.status === 'CANCELLED') {
      throw new BadRequestException('La transferencia ya se encuentra cancelada');
    }

    // Permisos
    const isPrivileged = user.role === Role.ADMIN || user.role === Role.ENCARGADO_ALMACEN;
    const isOriginStaff = user.locationId === transfer.fromLocationId;
    const isCreator = transfer.createdById === user.id;

    if (transfer.status === 'DRAFT') {
      if (!isPrivileged && !isOriginStaff && !isCreator) {
        throw new ForbiddenException('No tiene permisos para cancelar este borrador');
      }
    } else if (transfer.status === 'EN_TRANSITO') {
      if (!isPrivileged && !isOriginStaff) {
        throw new ForbiddenException('Solo el personal de origen o almacén puede cancelar una transferencia en tránsito');
      }
    }

    const recordedSerials: string[] = [];
    const recordedItemIds: string[] = [];

    const result = await this.transactionManager.runInTransaction(async (tx) => {
      // Si estaba EN_TRANSITO, revertir stock y series
      if (transfer.status === 'EN_TRANSITO') {
        for (const item of transfer.items) {
          if (item.hardwareItemId) {
            const hw = await this.hardwareItemRepository.findById(item.hardwareItemId, undefined, tx);
            if (hw && hw.status === 'EN_TRANSITO') {
              const cancelledHw = hw.cancelTransfer();
              await this.hardwareItemRepository.update(cancelledHw, tx);
              recordedSerials.push(hw.serialNumber);
              recordedItemIds.push(hw.id);
            }
          } else {
            // Re-acreditar stock en origen
            await this.quantityStockRepository.upsert(
              item.catalogId,
              transfer.fromLocationId,
              item.quantity,
              undefined,
              undefined,
              tx,
            );
          }
        }
      }

      await this.transferRepository.update(
        transfer.id,
        {
          status: 'CANCELLED',
          cancelReason: dto.reason ?? null,
        },
        tx,
      );

      return this.transferRepository.findById(transfer.id, tx);
    });

    await this.auditLogPort.record({
      userId: user.id,
      action: 'TRANSFER_CANCELLED',
      module: 'transfers',
      payload: {
        transferId: result!.id,
        code: result!.code,
        type: result!.type,
        status: 'CANCELLED',
        fromLocationId: result!.fromLocationId,
        fromLocationName: result!.fromLocationName,
        toLocationId: result!.toLocationId,
        toLocationName: result!.toLocationName,
        cancelReason: dto.reason,
        serials: recordedSerials,
        hardwareItemIds: recordedItemIds,
      },
      ipAddress,
    });

    return {
      id: result!.id,
      code: result!.code,
      type: result!.type,
      status: result!.status,
      fromLocationId: result!.fromLocationId,
      fromLocationName: result!.fromLocationName,
      toLocationId: result!.toLocationId,
      toLocationName: result!.toLocationName,
      createdById: result!.createdById,
      createdByName: result!.createdByName,
      receivedById: result!.receivedById,
      receivedByName: result!.receivedByName,
      notes: result!.notes,
      cancelReason: result!.cancelReason,
      dispatchedAt: result!.dispatchedAt,
      receivedAt: result!.receivedAt,
      createdAt: result!.createdAt,
      updatedAt: result!.updatedAt,
      itemsCount: result!.items.length,
      items: result!.items.map((i) => ({
        id: i.id,
        catalogId: i.catalogId,
        hardwareItemId: i.hardwareItemId,
        serialNumber: i.serialNumber,
        quantity: i.quantity,
        sku: i.sku,
        model: i.model,
        brand: i.brand,
      })),
    };
  }
}
