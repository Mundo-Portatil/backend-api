import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { QUANTITY_STOCK_REPOSITORY } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../../quantity-stock/domain/ports/out/quantity-stock-repository.port';
import { HARDWARE_ITEM_REPOSITORY } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { HardwareItemEntity } from '../../../hardware-items/domain/entities/hardware-item.entity';
import type { UnifiedInboundCommandDto } from '../dto/unified-inbound-command.dto';
import type {
  InboundItemResultDto,
  UnifiedInboundResponseDto,
} from '../dto/unified-inbound-response.dto';

@Injectable()
export class UnifiedInventoryInboundUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(QUANTITY_STOCK_REPOSITORY)
    private readonly quantityStockRepository: QuantityStockRepositoryPort,
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: UnifiedInboundCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<UnifiedInboundResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required for inbound');
    }

    // 1. Resolve central warehouse
    const locations = await this.locationRepository.findAll({ active: true });
    const centralLocation = locations.find((l) => l.type === 'ALMACEN_CENTRAL');
    if (!centralLocation) {
      throw new NotFoundException('Active central warehouse (ALMACEN_CENTRAL) not found');
    }

    // 2. Validate all catalog items and serial numbers upfront
    const validatedItems: {
      catalog: any;
      quantity: number;
      hasSerialNumbers: boolean;
      serialNumbers: string[];
      costPrice?: number;
      salePrice?: number;
    }[] = [];

    const allSerialsInBatch: string[] = [];

    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(`Quantity must be greater than zero for catalog "${item.catalogId}"`);
      }

      const catalog = await this.catalogRepository.findById(item.catalogId);
      if (!catalog) {
        throw new NotFoundException(`Catalog item with ID "${item.catalogId}" not found`);
      }
      if (!catalog.active) {
        throw new BadRequestException(`Catalog item "${catalog.brand} ${catalog.model}" is inactive`);
      }

      const cleanedSerials: string[] = [];
      if (item.hasSerialNumbers) {
        if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
          throw new BadRequestException(
            `Item "${catalog.brand} ${catalog.model}" requires exactly ${item.quantity} serial numbers (received ${item.serialNumbers?.length ?? 0})`,
          );
        }

        for (const sn of item.serialNumbers) {
          const upper = sn.trim().toUpperCase();
          if (!upper) {
            throw new BadRequestException(`Empty serial number provided for "${catalog.brand} ${catalog.model}"`);
          }
          if (cleanedSerials.includes(upper) || allSerialsInBatch.includes(upper)) {
            throw new ConflictException(`Duplicate serial number "${upper}" in inbound batch`);
          }
          cleanedSerials.push(upper);
          allSerialsInBatch.push(upper);
        }
      }

      validatedItems.push({
        catalog,
        quantity: item.quantity,
        hasSerialNumbers: item.hasSerialNumbers,
        serialNumbers: cleanedSerials,
        costPrice: item.costPrice,
        salePrice: item.salePrice ?? catalog.basePrice,
      });
    }

    // 3. Check collision with existing serial numbers in database
    if (allSerialsInBatch.length > 0) {
      const existingSerials = await this.hardwareItemRepository.findExistingSerials(allSerialsInBatch);
      if (existingSerials.length > 0) {
        throw new ConflictException(
          `The following serial numbers already exist in the database: ${existingSerials.join(', ')}`,
        );
      }
    }

    const batchId = crypto.randomUUID();
    let totalUnits = 0;

    // 4. Execute atomic transaction propagating tx to repositories
    const results: InboundItemResultDto[] = await this.transactionManager.runInTransaction(async (tx) => {
      const itemResults: InboundItemResultDto[] = [];

      for (const val of validatedItems) {
        totalUnits += val.quantity;

        // 4.1 Update physical stock balance in QuantityStock (Single Source of Truth)
        const updatedStock = await this.quantityStockRepository.upsert(
          val.catalog.id,
          centralLocation.id,
          val.quantity,
          val.costPrice,
          val.salePrice,
          tx,
        );

        // 4.2 If serialized, insert individual HardwareItem records
        const serialsCreated: string[] = [];
        if (val.hasSerialNumbers) {
          for (const sn of val.serialNumbers) {
            const hwEntity = HardwareItemEntity.create({
              serialNumber: sn,
              catalogId: val.catalog.id,
              locationId: centralLocation.id,
              status: 'EN_STOCK',
              parentChassisId: null,
              costPrice: val.costPrice,
              salePrice: val.salePrice,
            });

            await this.hardwareItemRepository.save(hwEntity, tx);
            serialsCreated.push(sn);
          }
        }

        itemResults.push({
          catalogId: val.catalog.id,
          catalogSku: val.catalog.sku,
          catalogBrand: val.catalog.brand,
          catalogModel: val.catalog.model,
          quantity: val.quantity,
          hasSerialNumbers: val.hasSerialNumbers,
          serialsCreated,
          totalStockResulting: updatedStock.quantity,
        });
      }

      return itemResults;
    });

    // 5. Record Audit Log
    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'UNIFIED_INVENTORY_INBOUND',
      module: 'inventory',
      payload: {
        batchId,
        locationId: centralLocation.id,
        locationName: centralLocation.name,
        totalItems: results.length,
        totalUnits,
        notes: dto.notes,
        results: results.map((r) => ({
          catalogId: r.catalogId,
          sku: r.catalogSku,
          quantity: r.quantity,
          hasSerialNumbers: r.hasSerialNumbers,
          serialsCount: r.serialsCreated.length,
        })),
      },
      ipAddress,
    });

    return {
      batchId,
      locationId: centralLocation.id,
      locationName: centralLocation.name,
      totalItems: results.length,
      totalUnits,
      results,
      createdAt: new Date(),
    };
  }
}
