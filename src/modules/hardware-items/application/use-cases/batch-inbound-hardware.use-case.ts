import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import { SERIAL_GENERATOR_PORT } from '../../domain/ports/out/serial-generator.port';
import type { SerialGeneratorPort } from '../../domain/ports/out/serial-generator.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { HardwareItemEntity } from '../../domain/entities/hardware-item.entity';
import type {
  BatchInboundHardwareCommandDto,
} from '../dto/batch-inbound-hardware-command.dto';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class BatchInboundHardwareUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(SERIAL_GENERATOR_PORT)
    private readonly serialGenerator: SerialGeneratorPort,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly transactionManager: TransactionManagerPort,
  ) {}

  async execute(
    dto: BatchInboundHardwareCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<HardwareItemResponseDto[]> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required for batch inbound');
    }

    const location = await this.locationRepository.findById(dto.locationId);
    if (!location) {
      throw new BadRequestException(`Location with ID "${dto.locationId}" not found`);
    }
    if (!location.active) {
      throw new BadRequestException(`Location "${location.name}" is inactive`);
    }

    // 1. Prepare items and generate serials if missing
    const preparedItems: {
      parent: HardwareItemEntity;
      children: HardwareItemEntity[];
    }[] = [];

    const allSerialsToCheck: string[] = [];

    for (const itemDto of dto.items) {
      const parentSerial = itemDto.serialNumber
        ? itemDto.serialNumber.trim().toUpperCase()
        : this.serialGenerator.generateInternalSerial();

      allSerialsToCheck.push(parentSerial);

      const parentEntity = HardwareItemEntity.create({
        serialNumber: parentSerial,
        catalogId: itemDto.catalogId,
        locationId: dto.locationId,
        status: 'EN_STOCK',
        costPrice: itemDto.costPrice,
        salePrice: itemDto.salePrice,
      });

      const childrenEntities: HardwareItemEntity[] = [];
      if (itemDto.children && itemDto.children.length > 0) {
        for (const childDto of itemDto.children) {
          const childSerial = childDto.serialNumber
            ? childDto.serialNumber.trim().toUpperCase()
            : this.serialGenerator.generateInternalSerial();

          allSerialsToCheck.push(childSerial);

          const childEntity = HardwareItemEntity.create({
            serialNumber: childSerial,
            catalogId: childDto.catalogId,
            locationId: dto.locationId,
            status: 'EN_STOCK',
            costPrice: childDto.costPrice,
            salePrice: childDto.salePrice,
          });

          childrenEntities.push(childEntity);
        }
      }

      preparedItems.push({
        parent: parentEntity,
        children: childrenEntities,
      });
    }

    // 2. Check for duplicate serials within the batch itself
    const serialSet = new Set<string>();
    for (const s of allSerialsToCheck) {
      if (serialSet.has(s)) {
        throw new ConflictException(`Duplicate serial number "${s}" within the inbound batch`);
      }
      serialSet.add(s);
    }

    // 3. Check against existing serials in the DB
    const existingInDb = await this.hardwareItemRepository.findExistingSerials(allSerialsToCheck);
    if (existingInDb.length > 0) {
      throw new ConflictException(
        `The following serial numbers already exist in the database: ${existingInDb.join(', ')}`,
      );
    }

    // 4. Validate that catalog items exist and are serialized
    const allCatalogIds = new Set<string>();
    for (const group of preparedItems) {
      allCatalogIds.add(group.parent.catalogId);
      for (const ch of group.children) {
        allCatalogIds.add(ch.catalogId);
      }
    }

    for (const catId of allCatalogIds) {
      const catalogItem = await this.catalogRepository.findById(catId);
      if (!catalogItem) {
        throw new BadRequestException(`Catalog item with ID "${catId}" not found`);
      }
      if (!catalogItem.isSerialized) {
        throw new BadRequestException(
          `Catalog item "${catalogItem.name}" (${catalogItem.sku}) is non-serialized and cannot be ingested as hardware`,
        );
      }
    }

    // 5. Execute insertion within a transaction
    const results = await this.transactionManager.runInTransaction(async () => {
      const createdParents: HardwareItemResponseDto[] = [];

      for (const group of preparedItems) {
        const savedParent = await this.hardwareItemRepository.save(group.parent);

        const savedChildren: HardwareItemEntity[] = [];
        for (const child of group.children) {
          const childWithParent = HardwareItemEntity.create({
            serialNumber: child.serialNumber,
            catalogId: child.catalogId,
            locationId: child.locationId,
            status: child.status,
            parentChassisId: savedParent.id,
            costPrice: child.costPrice,
            salePrice: child.salePrice,
          });
          const savedChild = await this.hardwareItemRepository.save(childWithParent);
          savedChildren.push(savedChild);
        }

        createdParents.push({
          id: savedParent.id,
          serialNumber: savedParent.serialNumber,
          catalogId: savedParent.catalogId,
          locationId: savedParent.locationId,
          status: savedParent.status,
          parentChassisId: null,
          costPrice: savedParent.costPrice,
          salePrice: savedParent.salePrice,
          createdAt: savedParent.createdAt,
          updatedAt: savedParent.updatedAt,
          components: savedChildren.map((c) => ({
            id: c.id,
            serialNumber: c.serialNumber,
            catalogId: c.catalogId,
            locationId: c.locationId,
            status: c.status,
            parentChassisId: savedParent.id,
            costPrice: c.costPrice,
            salePrice: c.salePrice,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
        });
      }

      return createdParents;
    });

    // 6. Record audit log
    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'BATCH_INBOUND_HARDWARE',
      module: 'hardware-items',
      payload: {
        locationId: dto.locationId,
        parentCount: results.length,
        totalItemsCount: allSerialsToCheck.length,
        serials: allSerialsToCheck,
      },
      ipAddress,
    });

    return results;
  }
}
