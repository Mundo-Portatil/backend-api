import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { BarcodeLabelValueObject } from '../../domain/value-objects/barcode-label.vo';
import type { BarcodeLabelResponseDto } from '../dto/barcode-label-response.dto';

@Injectable()
export class GetBarcodeLabelUseCase {
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
    id: string,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<BarcodeLabelResponseDto> {
    const item = await this.hardwareItemRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Hardware item with ID "${id}" not found`);
    }

    const catalogItem = await this.catalogRepository.findById(item.catalogId);
    const location = await this.locationRepository.findById(item.locationId);

    const title = catalogItem ? `${catalogItem.brand} ${catalogItem.model}` : 'EQUIPO';
    const specsSummary = catalogItem
      ? BarcodeLabelValueObject.formatSpecs({
          processor: catalogItem.processor,
          ramCapacity: catalogItem.ramCapacity,
          storageCapacity: catalogItem.storageCapacity,
          gpu: catalogItem.gpu,
        })
      : 'N/A';

    const locationName = location ? location.name : 'Mundo Portátil';
    const price = item.salePrice ?? (catalogItem ? catalogItem.basePrice : null);

    const labelVo = new BarcodeLabelValueObject(
      item.id,
      item.serialNumber,
      title,
      specsSummary,
      locationName,
      price,
    );

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'PRINT_BARCODE_LABEL',
      module: 'hardware-items',
      payload: {
        hardwareItemId: item.id,
        serialNumber: item.serialNumber,
      },
      ipAddress,
    });

    return {
      hardwareItemId: labelVo.hardwareItemId,
      barcodeValue: labelVo.barcodeValue,
      title: labelVo.title,
      specsSummary: labelVo.specsSummary,
      locationName: labelVo.locationName,
      price: labelVo.price,
    };
  }
}
