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
import type { TransferDetailResponseDto } from '../dto/transfer-detail-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class DispatchTransferUseCase {
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
    user: { id: string; role: Role; locationId: string | null },
    ipAddress?: string,
  ): Promise<TransferDetailResponseDto> {
    const transfer = await this.transferRepository.findById(id);
    if (!transfer) {
      throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    }

    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException(
        `Solo transferencias en estado DRAFT pueden ser despachadas (estado actual: ${transfer.status})`,
      );
    }

    // Permisos: solo admin, encargado almacén, o personal del puesto de origen
    const isPrivileged = user.role === Role.ADMIN || user.role === Role.ENCARGADO_ALMACEN;
    const isOriginStaff = user.locationId === transfer.fromLocationId;
    if (!isPrivileged && !isOriginStaff) {
      throw new ForbiddenException('Solo el personal del puesto de origen puede despachar la transferencia');
    }

    const recordedSerials: string[] = [];
    const recordedItemIds: string[] = [];
    const now = new Date();

    const result = await this.transactionManager.runInTransaction(async (tx) => {
      for (const item of transfer.items) {
        if (item.hardwareItemId) {
          const hw = await this.hardwareItemRepository.findById(item.hardwareItemId, undefined, tx);
          if (!hw) {
            throw new NotFoundException(`Ítem serializado ${item.hardwareItemId} no encontrado`);
          }
          if (hw.locationId !== transfer.fromLocationId) {
            throw new BadRequestException(
              `El ítem con serie ${hw.serialNumber} ya no pertenece al puesto de origen`,
            );
          }
          if (hw.status !== 'EN_STOCK') {
            throw new BadRequestException(
              `El ítem con serie ${hw.serialNumber} no se encuentra EN_STOCK (estado actual: ${hw.status})`,
            );
          }

          const dispatchedHw = hw.dispatchTransfer();
          await this.hardwareItemRepository.update(dispatchedHw, tx);

          recordedSerials.push(hw.serialNumber);
          recordedItemIds.push(hw.id);
        } else {
          const stock = await this.quantityStockRepository.findByCatalogAndLocation(
            item.catalogId,
            transfer.fromLocationId,
            tx,
          );
          if (!stock || stock.quantity < item.quantity) {
            const avail = stock ? stock.quantity : 0;
            throw new BadRequestException(
              `Stock insuficiente en origen para catálogo ${item.catalogId}. Disponible: ${avail}, Requerido: ${item.quantity}`,
            );
          }

          await this.quantityStockRepository.upsert(
            item.catalogId,
            transfer.fromLocationId,
            -item.quantity,
            undefined,
            undefined,
            tx,
          );
        }
      }

      await this.transferRepository.update(
        transfer.id,
        {
          status: 'EN_TRANSITO',
          dispatchedAt: now,
        },
        tx,
      );

      return this.transferRepository.findById(transfer.id, tx);
    });

    await this.auditLogPort.record({
      userId: user.id,
      action: 'TRANSFER_DISPATCHED',
      module: 'transfers',
      payload: {
        transferId: result!.id,
        code: result!.code,
        type: result!.type,
        status: 'EN_TRANSITO',
        fromLocationId: result!.fromLocationId,
        fromLocationName: result!.fromLocationName,
        toLocationId: result!.toLocationId,
        toLocationName: result!.toLocationName,
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
