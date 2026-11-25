import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
export class GetBatchBarcodeLabelsUseCase {
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
    hardwareItemIds: string[],
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<BarcodeLabelResponseDto[]> {
    if (!hardwareItemIds || hardwareItemIds.length === 0) {
      throw new BadRequestException('At least one hardware item ID is required');
    }

    const labels: BarcodeLabelResponseDto[] = [];
    const printedSerials: string[] = [];

    for (const id of hardwareItemIds) {
      const item = await this.hardwareItemRepository.findById(id);
      if (!item) continue;

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

      labels.push({
        hardwareItemId: item.id,
        barcodeValue: item.serialNumber,
        title,
        specsSummary,
        locationName,
        price,
      });

      printedSerials.push(item.serialNumber);
    }

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'PRINT_BARCODE_LABELS_BATCH',
      module: 'hardware-items',
      payload: {
        count: labels.length,
        itemIds: hardwareItemIds,
        serials: printedSerials,
      },
      ipAddress,
    });

    return labels;
  }
}
