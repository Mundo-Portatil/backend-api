import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TRANSFER_REPOSITORY } from '../../domain/ports/out/transfer-repository.port';
import type { TransferRepositoryPort } from '../../domain/ports/out/transfer-repository.port';
import { TRANSFER_CODE_GENERATOR } from '../../domain/ports/out/transfer-code-generator.port';
import type { TransferCodeGeneratorPort } from '../../domain/ports/out/transfer-code-generator.port';
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
import { InternalTransferEntity } from '../../domain/entities/internal-transfer.entity';
import { InternalTransferItemEntity } from '../../domain/entities/internal-transfer-item.entity';
import type { CreateTransferCommandDto } from '../dto/create-transfer-command.dto';
import type { TransferDetailResponseDto } from '../dto/transfer-detail-response.dto';
import { LocationType, Role } from '@prisma/client';

@Injectable()
export class CreateTransferUseCase {
  constructor(
    @Inject(TRANSFER_REPOSITORY)
    private readonly transferRepository: TransferRepositoryPort,
    @Inject(TRANSFER_CODE_GENERATOR)
    private readonly codeGenerator: TransferCodeGeneratorPort,
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
    dto: CreateTransferCommandDto,
    user: { id: string; role: Role; locationId: string | null },
    ipAddress?: string,
  ): Promise<TransferDetailResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La transferencia debe contener al menos un ítem');
    }

    // 1. Validar duplicados en hardwareItemId y catalogId cuantitativo
    const serializedIds: string[] = [];
    const quantitativeCatalogIds: string[] = [];

    for (const item of dto.items) {
      if (item.hardwareItemId) {
        if (serializedIds.includes(item.hardwareItemId)) {
          throw new BadRequestException('items contiene hardwareItemId duplicados');
        }
        serializedIds.push(item.hardwareItemId);
      } else {
        if (quantitativeCatalogIds.includes(item.catalogId)) {
          throw new BadRequestException('items contiene catálogos cuantitativos duplicados');
        }
        quantitativeCatalogIds.push(item.catalogId);
      }
    }

    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('La ubicación de origen y destino no pueden ser la misma');
    }

    // 2. Validar que ambas ubicaciones existan, estén activas y sean PUESTO
    const fromLocation = await this.locationRepository.findById(dto.fromLocationId);
    if (!fromLocation || !fromLocation.active) {
      throw new BadRequestException('La ubicación de origen no existe o se encuentra inactiva');
    }
    if (fromLocation.type !== LocationType.PUESTO) {
      throw new BadRequestException('Las transferencias entre puestos solo pueden originarse en un PUESTO');
    }

    const toLocation = await this.locationRepository.findById(dto.toLocationId);
    if (!toLocation || !toLocation.active) {
      throw new BadRequestException('La ubicación de destino no existe o se encuentra inactiva');
    }
    if (toLocation.type !== LocationType.PUESTO) {
      throw new BadRequestException('Las transferencias entre puestos solo pueden tener como destino un PUESTO');
    }

    // 3. Validar permisos de rol
    if (user.role === Role.VENDEDOR || user.role === Role.TECNICO) {
      if (dto.fromLocationId !== user.locationId) {
        throw new ForbiddenException('Solo puede originar transferencias desde su puesto asignado');
      }
    }

    const code = await this.codeGenerator.generateCode();
    const isDispatchImmediate = dto.status === 'EN_TRANSITO';

    const recordedSerials: string[] = [];
    const recordedItemIds: string[] = [];

    const result = await this.transactionManager.runInTransaction(async (tx) => {
      const transferItems: InternalTransferItemEntity[] = [];

      for (const inputItem of dto.items) {
        if (inputItem.hardwareItemId) {
          const hw = await this.hardwareItemRepository.findById(inputItem.hardwareItemId, undefined, tx);
          if (!hw) {
            throw new NotFoundException(`Ítem con ID ${inputItem.hardwareItemId} no encontrado`);
          }
          if (hw.locationId !== dto.fromLocationId) {
            throw new BadRequestException(
              `El ítem con serie ${hw.serialNumber} no pertenece a la ubicación origen`,
            );
          }
          if (hw.status !== 'EN_STOCK') {
            throw new BadRequestException(
              `El ítem con serie ${hw.serialNumber} no se encuentra EN_STOCK (estado actual: ${hw.status})`,
            );
          }

          if (isDispatchImmediate) {
            const dispatchedHw = hw.dispatchTransfer();
            await this.hardwareItemRepository.update(dispatchedHw, tx);
          }

          recordedSerials.push(hw.serialNumber);
          recordedItemIds.push(hw.id);

          transferItems.push(
            InternalTransferItemEntity.create({
              transferId: '',
              catalogId: hw.catalogId,
              hardwareItemId: hw.id,
              quantity: 1,
              serialNumber: hw.serialNumber,
            }),
          );
        } else {
          const qty = inputItem.quantity ?? 1;
          if (qty <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
          }

          const stock = await this.quantityStockRepository.findByCatalogAndLocation(
            inputItem.catalogId,
            dto.fromLocationId,
            tx,
          );
          if (!stock || stock.quantity < qty) {
            const avail = stock ? stock.quantity : 0;
            throw new BadRequestException(
              `Stock insuficiente en origen para catálogo ${inputItem.catalogId}. Disponible: ${avail}, Requerido: ${qty}`,
            );
          }

          if (isDispatchImmediate) {
            await this.quantityStockRepository.upsert(
              inputItem.catalogId,
              dto.fromLocationId,
              -qty,
              undefined,
              undefined,
              tx,
            );
          }

          transferItems.push(
            InternalTransferItemEntity.create({
              transferId: '',
              catalogId: inputItem.catalogId,
              quantity: qty,
            }),
          );
        }
      }

      const entity = isDispatchImmediate
        ? InternalTransferEntity.createDispatched({
            code,
            fromLocationId: dto.fromLocationId,
            toLocationId: dto.toLocationId,
            createdById: user.id,
            notes: dto.notes,
            items: transferItems,
            fromLocationName: fromLocation.name,
            toLocationName: toLocation.name,
          })
        : InternalTransferEntity.createDraft({
            code,
            fromLocationId: dto.fromLocationId,
            toLocationId: dto.toLocationId,
            createdById: user.id,
            notes: dto.notes,
            items: transferItems,
            fromLocationName: fromLocation.name,
            toLocationName: toLocation.name,
          });

      return this.transferRepository.create(entity, tx);
    });

    // Registrar en auditoría
    await this.auditLogPort.record({
      userId: user.id,
      action: isDispatchImmediate ? 'TRANSFER_DISPATCHED' : 'TRANSFER_DRAFT_CREATED',
      module: 'transfers',
      payload: {
        transferId: result.id,
        code: result.code,
        type: 'ENTRE_PUESTOS',
        status: result.status,
        fromLocationId: fromLocation.id,
        fromLocationName: fromLocation.name,
        toLocationId: toLocation.id,
        toLocationName: toLocation.name,
        serials: recordedSerials,
        hardwareItemIds: recordedItemIds,
        notes: dto.notes,
      },
      ipAddress,
    });

    return {
      id: result.id,
      code: result.code,
      type: result.type,
      status: result.status,
      fromLocationId: result.fromLocationId,
      fromLocationName: fromLocation.name,
      toLocationId: result.toLocationId,
      toLocationName: toLocation.name,
      createdById: result.createdById,
      createdByName: user.role,
      receivedById: result.receivedById,
      receivedByName: null,
      notes: result.notes,
      cancelReason: result.cancelReason,
      dispatchedAt: result.dispatchedAt,
      receivedAt: result.receivedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      itemsCount: result.items.length,
      items: result.items.map((i) => ({
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
