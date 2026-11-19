import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { CatalogItemEntity } from '../../../catalog/domain/entities/catalog-item.entity';
import type { ApproveUsedComponentCommandDto } from '../dto/approve-used-component-command.dto';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class ApproveUsedComponentUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: ApproveUsedComponentCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<HardwareItemResponseDto> {
    const item = await this.hardwareItemRepository.findById(dto.itemId);
    if (!item) {
      throw new NotFoundException(`Hardware item with ID "${dto.itemId}" not found`);
    }

    const location = await this.locationRepository.findById(dto.locationId);
    if (!location || !location.active) {
      throw new BadRequestException('A valid active location is required');
    }

    if (dto.salePrice <= 0) {
      throw new BadRequestException('Sale price for used component must be greater than zero');
    }

    const originalCatalog = await this.catalogRepository.findById(item.catalogId);
    if (!originalCatalog) {
      throw new BadRequestException(`Original catalog item "${item.catalogId}" not found`);
    }

    let targetCatalogId = originalCatalog.id;

    if (!originalCatalog.isSecondHand) {
      const usedSku = `${originalCatalog.sku}-USED`;
      let usedCatalog = await this.catalogRepository.findBySku(usedSku);

      if (!usedCatalog) {
        const newUsedCatalogEntity = CatalogItemEntity.create({
          sku: usedSku,
          name: `${originalCatalog.name} (Segunda Mano)`,
          brand: originalCatalog.brand,
          model: originalCatalog.model,
          categoryId: originalCatalog.categoryId,
          processor: originalCatalog.processor ?? undefined,
          ramCapacity: originalCatalog.ramCapacity ?? undefined,
          storageCapacity: originalCatalog.storageCapacity ?? undefined,
          gpu: originalCatalog.gpu ?? undefined,
          screenSize: originalCatalog.screenSize ?? undefined,
          isSerialized: true,
          minStockThreshold: 1,
          basePrice: dto.salePrice,
          isSecondHand: true,
          active: true,
        });

        usedCatalog = await this.catalogRepository.save(newUsedCatalogEntity);
      }

      targetCatalogId = usedCatalog.id;
    }

    const updatedEntity = item.updateDetails({
      catalogId: targetCatalogId,
      locationId: dto.locationId,
      status: 'EN_STOCK',
      salePrice: dto.salePrice,
      parentChassisId: null,
    });

    const saved = await this.hardwareItemRepository.update(updatedEntity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'APPROVE_USED_COMPONENT',
      module: 'hardware-items',
      payload: {
        itemId: saved.id,
        serialNumber: saved.serialNumber,
        targetCatalogId,
        locationId: dto.locationId,
        salePrice: dto.salePrice,
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
