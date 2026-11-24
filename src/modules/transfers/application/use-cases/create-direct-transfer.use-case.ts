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
import type { CreateDirectTransferCommandDto } from '../dto/create-direct-transfer-command.dto';
import type { TransferDetailResponseDto } from '../dto/transfer-detail-response.dto';
import { LocationType, Role } from '@prisma/client';

@Injectable()
export class CreateDirectTransferUseCase {
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
    dto: CreateDirectTransferCommandDto,
    user: { id: string; role: Role; locationId: string | null },
    ipAddress?: string,
  ): Promise<TransferDetailResponseDto> {
    // 1. Validar duplicados en hardwareItemIds
    if (dto.hardwareItemIds && dto.hardwareItemIds.length > 0) {
      const uniqueIds = new Set(dto.hardwareItemIds);
      if (uniqueIds.size !== dto.hardwareItemIds.length) {
        throw new BadRequestException('hardwareItemIds contiene elementos duplicados');
      }
    }

    // 2. Validar duplicados en quantities
    if (dto.quantities && dto.quantities.length > 0) {
      const catalogIds = dto.quantities.map((q) => q.catalogId);
      const uniqueCatalogIds = new Set(catalogIds);
      if (uniqueCatalogIds.size !== catalogIds.length) {
        throw new BadRequestException('quantities contiene catálogos duplicados');
      }
    }

    const hasSerials = dto.hardwareItemIds && dto.hardwareItemIds.length > 0;
    const hasQuantities = dto.quantities && dto.quantities.length > 0;
    if (!hasSerials && !hasQuantities) {
      throw new BadRequestException('Debe incluir al menos un ítem serializado o cuantitativo');
    }

    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('La ubicación origen y destino no pueden ser la misma');
    }

    // 3. Validar ubicaciones
    const fromLocation = await this.locationRepository.findById(dto.fromLocationId);
    if (!fromLocation || !fromLocation.active) {
      throw new BadRequestException('La ubicación de origen no existe o se encuentra inactiva');
    }

    const toLocation = await this.locationRepository.findById(dto.toLocationId);
    if (!toLocation || !toLocation.active) {
      throw new BadRequestException('La ubicación de destino no existe o se encuentra inactiva');
    }

    const isCentralToPuesto =
      fromLocation.type === LocationType.ALMACEN_CENTRAL && toLocation.type === LocationType.PUESTO;
    const isPuestoToCentral =
      fromLocation.type === LocationType.PUESTO && toLocation.type === LocationType.ALMACEN_CENTRAL;

    if (!isCentralToPuesto && !isPuestoToCentral) {
      throw new BadRequestException(
        'El traslado directo solo está permitido entre Almacén Central y un Puesto (en cualquier sentido)',
      );
    }

    // 4. Ámbito de rol: VENDEDOR y TECNICO solo pueden operar con su propio puesto
    if (user.role === Role.VENDEDOR || user.role === Role.TECNICO) {
      const userPuestoId = user.locationId;
      const operatesOwnPuesto =
        dto.fromLocationId === userPuestoId || dto.toLocationId === userPuestoId;
      if (!operatesOwnPuesto) {
        throw new ForbiddenException(
          'No tiene permisos para realizar traslados fuera de su puesto asignado',
        );
      }
    }

    const code = await this.codeGenerator.generateCode();
    const recordedSerials: string[] = [];
    const recordedItemIds: string[] = [];

    const result = await this.transactionManager.runInTransaction(async (tx) => {
      const transferItems: InternalTransferItemEntity[] = [];

      // Procesar serializados
      if (dto.hardwareItemIds && dto.hardwareItemIds.length > 0) {
        for (const itemId of dto.hardwareItemIds) {
          const item = await this.hardwareItemRepository.findById(itemId, undefined, tx);
          if (!item) {
            throw new NotFoundException(`Ítem con ID ${itemId} no encontrado`);
          }
          if (item.locationId !== dto.fromLocationId) {
            throw new BadRequestException(
              `El ítem con serie ${item.serialNumber} no pertenece a la ubicación origen`,
            );
          }
          if (item.status !== 'EN_STOCK') {
            throw new BadRequestException(
              `El ítem con serie ${item.serialNumber} no está EN_STOCK (estado actual: ${item.status})`,
            );
          }

          const transferredItem = item.transferDirect(dto.toLocationId);
          await this.hardwareItemRepository.update(transferredItem, tx);

          recordedSerials.push(item.serialNumber);
          recordedItemIds.push(item.id);

          transferItems.push(
            InternalTransferItemEntity.create({
              transferId: '',
              catalogId: item.catalogId,
              hardwareItemId: item.id,
              quantity: 1,
              serialNumber: item.serialNumber,
            }),
          );
        }
      }

      // Procesar cuantitativos
      if (dto.quantities && dto.quantities.length > 0) {
        for (const q of dto.quantities) {
          if (q.quantity <= 0) {
            throw new BadRequestException('La cantidad a trasladar debe ser mayor a 0');
          }

          const fromStock = await this.quantityStockRepository.findByCatalogAndLocation(
            q.catalogId,
            dto.fromLocationId,
            tx,
          );

          if (!fromStock || fromStock.quantity < q.quantity) {
            const available = fromStock ? fromStock.quantity : 0;
            throw new BadRequestException(
              `Stock insuficiente en origen para catálogo ${q.catalogId}. Disponible: ${available}, Requerido: ${q.quantity}`,
            );
          }

          // Descontar origen
          await this.quantityStockRepository.upsert(
            q.catalogId,
            dto.fromLocationId,
            -q.quantity,
            undefined,
            undefined,
            tx,
          );

          // Incrementar destino preservando precios de origen si no existía
          await this.quantityStockRepository.upsert(
            q.catalogId,
            dto.toLocationId,
            q.quantity,
            fromStock.costPrice ?? undefined,
            fromStock.salePrice ?? undefined,
            tx,
          );

          transferItems.push(
            InternalTransferItemEntity.create({
              transferId: '',
              catalogId: q.catalogId,
              quantity: q.quantity,
            }),
          );
        }
      }

      const transferEntity = InternalTransferEntity.createDirect({
        code,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        createdById: user.id,
        receivedById: user.id,
        notes: dto.notes,
        items: transferItems,
        fromLocationName: fromLocation.name,
        toLocationName: toLocation.name,
      });

      return this.transferRepository.create(transferEntity, tx);
    });

    // Registrar en Bitácora con seriales y IDs para Hoja de Vida
    await this.auditLogPort.record({
      userId: user.id,
      action: 'TRANSFER_DIRECT_COMPLETED',
      module: 'transfers',
      payload: {
        transferId: result.id,
        code: result.code,
        type: 'DIRECTO',
        fromLocationId: fromLocation.id,
        fromLocationName: fromLocation.name,
        toLocationId: toLocation.id,
        toLocationName: toLocation.name,
        serials: recordedSerials,
        hardwareItemIds: recordedItemIds,
        quantitiesCount: dto.quantities ? dto.quantities.length : 0,
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
      receivedByName: user.role,
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
