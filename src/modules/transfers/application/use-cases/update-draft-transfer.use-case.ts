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
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { InternalTransferItemEntity } from '../../domain/entities/internal-transfer-item.entity';
import type { UpdateDraftTransferCommandDto } from '../dto/update-draft-transfer-command.dto';
import type { TransferDetailResponseDto } from '../dto/transfer-detail-response.dto';
import { LocationType, Role } from '@prisma/client';

@Injectable()
export class UpdateDraftTransferUseCase {
  constructor(
    @Inject(TRANSFER_REPOSITORY)
    private readonly transferRepository: TransferRepositoryPort,
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(QUANTITY_STOCK_REPOSITORY)
    private readonly quantityStockRepository: QuantityStockRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    id: string,
    dto: UpdateDraftTransferCommandDto,
    user: { id: string; role: Role; locationId: string | null },
    ipAddress?: string,
  ): Promise<TransferDetailResponseDto> {
    const transfer = await this.transferRepository.findById(id);
    if (!transfer) {
      throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    }

    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException(
        `Solo transferencias en estado DRAFT pueden ser editadas (estado actual: ${transfer.status})`,
      );
    }

    // Permisos
    const isPrivileged = user.role === Role.ADMIN || user.role === Role.ENCARGADO_ALMACEN;
    const isCreator = transfer.createdById === user.id;
    const isOriginStaff = user.locationId === transfer.fromLocationId;
    if (!isPrivileged && !isCreator && !isOriginStaff) {
      throw new ForbiddenException('No tiene permisos para editar este borrador de transferencia');
    }

    let targetToLocationId = transfer.toLocationId;
    let targetToLocationName = transfer.toLocationName;

    if (dto.toLocationId && dto.toLocationId !== transfer.toLocationId) {
      if (dto.toLocationId === transfer.fromLocationId) {
        throw new BadRequestException('La ubicación de destino no puede ser la misma de origen');
      }
      const toLoc = await this.locationRepository.findById(dto.toLocationId);
      if (!toLoc || !toLoc.active) {
        throw new BadRequestException('La ubicación de destino no existe o se encuentra inactiva');
      }
      if (toLoc.type !== LocationType.PUESTO) {
        throw new BadRequestException('La ubicación de destino debe ser de tipo PUESTO');
      }
      targetToLocationId = toLoc.id;
      targetToLocationName = toLoc.name;
    }

    let updatedItems = transfer.items;

    if (dto.items) {
      if (dto.items.length === 0) {
        throw new BadRequestException('La transferencia no puede quedar sin ítems');
      }

      // Validar duplicados
      const serializedIds: string[] = [];
      const quantCatalogIds: string[] = [];
      for (const item of dto.items) {
        if (item.hardwareItemId) {
          if (serializedIds.includes(item.hardwareItemId)) {
            throw new BadRequestException('items contiene hardwareItemId duplicados');
          }
          serializedIds.push(item.hardwareItemId);
        } else {
          if (quantCatalogIds.includes(item.catalogId)) {
            throw new BadRequestException('items contiene catálogos cuantitativos duplicados');
          }
          quantCatalogIds.push(item.catalogId);
        }
      }

      const newItems: InternalTransferItemEntity[] = [];
      for (const item of dto.items) {
        if (item.hardwareItemId) {
          const hw = await this.hardwareItemRepository.findById(item.hardwareItemId);
          if (!hw) {
            throw new NotFoundException(`Ítem ${item.hardwareItemId} no encontrado`);
          }
          if (hw.locationId !== transfer.fromLocationId) {
            throw new BadRequestException(
              `El ítem con serie ${hw.serialNumber} no pertenece a la ubicación origen`,
            );
          }
          if (hw.status !== 'EN_STOCK') {
            throw new BadRequestException(
              `El ítem con serie ${hw.serialNumber} no se encuentra EN_STOCK`,
            );
          }
          newItems.push(
            InternalTransferItemEntity.create({
              transferId: transfer.id,
              catalogId: hw.catalogId,
              hardwareItemId: hw.id,
              quantity: 1,
              serialNumber: hw.serialNumber,
            }),
          );
        } else {
          const qty = item.quantity ?? 1;
          if (qty <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
          }
          const stock = await this.quantityStockRepository.findByCatalogAndLocation(
            item.catalogId,
            transfer.fromLocationId,
          );
          if (!stock || stock.quantity < qty) {
            const avail = stock ? stock.quantity : 0;
            throw new BadRequestException(
              `Stock insuficiente en origen para catálogo ${item.catalogId}. Disponible: ${avail}, Requerido: ${qty}`,
            );
          }
          newItems.push(
            InternalTransferItemEntity.create({
              transferId: transfer.id,
              catalogId: item.catalogId,
              quantity: qty,
            }),
          );
        }
      }
      updatedItems = newItems;
    }

    const updatedEntity = transfer.updateDraft({
      toLocationId: targetToLocationId,
      notes: dto.notes,
      items: updatedItems,
    });

    const result = await this.transactionManager.runInTransaction(async (tx) => {
      await this.transferRepository.update(
        id,
        {
          toLocationId: targetToLocationId,
          notes: dto.notes !== undefined ? dto.notes : transfer.notes,
        },
        tx,
      );

      if (dto.items) {
        await this.transferRepository.updateItems(id, updatedItems, tx);
      }

      return this.transferRepository.findById(id, tx);
    });

    await this.auditLogPort.record({
      userId: user.id,
      action: 'TRANSFER_DRAFT_UPDATED',
      module: 'transfers',
      payload: {
        transferId: id,
        code: transfer.code,
        changes: {
          toLocationId: targetToLocationId,
          notes: dto.notes,
          itemsCount: updatedItems.length,
        },
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
      toLocationName: targetToLocationName ?? result!.toLocationName,
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
