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
import type { ConfirmTransferCommandDto } from '../dto/confirm-transfer-command.dto';
import type { TransferDetailResponseDto } from '../dto/transfer-detail-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ConfirmTransferUseCase {
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
    dto: ConfirmTransferCommandDto,
    user: { id: string; role: Role; locationId: string | null },
    ipAddress?: string,
  ): Promise<TransferDetailResponseDto> {
    const transfer = await this.transferRepository.findById(id);
    if (!transfer) {
      throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    }

    if (transfer.status !== 'EN_TRANSITO') {
      throw new BadRequestException(
        `Solo transferencias en estado EN_TRANSITO pueden ser confirmadas (estado actual: ${transfer.status})`,
      );
    }

    // Permisos: Admin, Almacén, o personal del puesto de destino
    const isPrivileged = user.role === Role.ADMIN || user.role === Role.ENCARGADO_ALMACEN;
    const isDestinationStaff = user.locationId === transfer.toLocationId;
    if (!isPrivileged && !isDestinationStaff) {
      throw new ForbiddenException('Solo el personal del puesto destino puede confirmar la recepción');
    }

    // Validación y normalización estricta de scannedSerials
    if (!dto.scannedSerials || !Array.isArray(dto.scannedSerials)) {
      throw new BadRequestException('scannedSerials debe ser una lista de series');
    }

    // Rechazar duplicados en scannedSerials
    const rawScanned = dto.scannedSerials.map((s) => s.trim().toUpperCase());
    const uniqueScanned = new Set(rawScanned);
    if (uniqueScanned.size !== rawScanned.length) {
      throw new BadRequestException('scannedSerials contiene elementos duplicados');
    }

    // Obtener series esperadas de los ítems de la transferencia
    const expectedSerials = transfer.items
      .filter((i) => i.hardwareItemId && i.serialNumber)
      .map((i) => i.serialNumber!.trim().toUpperCase());

    // Comparar exactamente el conjunto de series
    if (rawScanned.length !== expectedSerials.length) {
      throw new BadRequestException(
        `Se esperaban ${expectedSerials.length} series pero se escanearon ${rawScanned.length}`,
      );
    }

    const expectedSet = new Set(expectedSerials);
    for (const serial of rawScanned) {
      if (!expectedSet.has(serial)) {
        throw new BadRequestException(
          `La serie escaneada "${serial}" no coincide con las series despachadas en la transferencia`,
        );
      }
    }

    const recordedItemIds: string[] = [];
    const now = new Date();

    const result = await this.transactionManager.runInTransaction(async (tx) => {
      for (const item of transfer.items) {
        if (item.hardwareItemId) {
          const hw = await this.hardwareItemRepository.findById(item.hardwareItemId, undefined, tx);
          if (!hw) {
            throw new NotFoundException(`Ítem serializado ${item.hardwareItemId} no encontrado`);
          }
          if (hw.status !== 'EN_TRANSITO') {
            throw new BadRequestException(
              `El ítem con serie ${hw.serialNumber} no se encuentra EN_TRANSITO (estado actual: ${hw.status})`,
            );
          }

          const confirmedHw = hw.confirmTransfer(transfer.toLocationId);
          await this.hardwareItemRepository.update(confirmedHw, tx);
          recordedItemIds.push(hw.id);
        } else {
          // Obtener costos y precios de venta del origen para preservar en destino si se crea nuevo
          const fromStock = await this.quantityStockRepository.findByCatalogAndLocation(
            item.catalogId,
            transfer.fromLocationId,
            tx,
          );

          await this.quantityStockRepository.upsert(
            item.catalogId,
            transfer.toLocationId,
            item.quantity,
            fromStock?.costPrice ?? undefined,
            fromStock?.salePrice ?? undefined,
            tx,
          );
        }
      }

      await this.transferRepository.update(
        transfer.id,
        {
          status: 'COMPLETED',
          receivedById: user.id,
          receivedAt: now,
        },
        tx,
      );

      return this.transferRepository.findById(transfer.id, tx);
    });

    await this.auditLogPort.record({
      userId: user.id,
      action: 'TRANSFER_CONFIRMED',
      module: 'transfers',
      payload: {
        transferId: result!.id,
        code: result!.code,
        type: result!.type,
        status: 'COMPLETED',
        fromLocationId: result!.fromLocationId,
        fromLocationName: result!.fromLocationName,
        toLocationId: result!.toLocationId,
        toLocationName: result!.toLocationName,
        serials: rawScanned,
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
      receivedByName: user.role,
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
