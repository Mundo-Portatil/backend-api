import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { PrintModelBarcodeLabelsCommandDto } from '../dto/print-model-barcode-labels-command.dto';
import type { ModelBarcodeLabelResponseDto } from '../dto/model-barcode-label-response.dto';

@Injectable()
export class PrintModelBarcodeLabelsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: PrintModelBarcodeLabelsCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<ModelBarcodeLabelResponseDto[]> {
    if (dto.copies < 1 || dto.copies > 100) {
      throw new BadRequestException('Copies must be between 1 and 100');
    }

    const catalogItem = await this.catalogRepository.findById(dto.catalogId);
    if (!catalogItem) {
      throw new NotFoundException(`Catalog item with ID "${dto.catalogId}" not found`);
    }

    let location;
    if (dto.locationId) {
      location = await this.locationRepository.findById(dto.locationId);
      if (!location) {
        throw new NotFoundException(`Location with ID "${dto.locationId}" not found`);
      }
    } else {
      const locations = await this.locationRepository.findAll({ active: true });
      location = locations.find((l) => l.type === 'ALMACEN_CENTRAL');
      if (!location) {
        throw new NotFoundException('Active central warehouse (ALMACEN_CENTRAL) not found');
      }
    }

    const specsParts = [
      catalogItem.processor,
      catalogItem.ramCapacity,
      catalogItem.storageCapacity,
      catalogItem.gpu,
      catalogItem.screenSize,
    ].filter(Boolean);

    const specsSummary = specsParts.length > 0 ? specsParts.join(' | ') : 'N/A';
    const title = `${catalogItem.brand} ${catalogItem.model}`;
    const locationName = location.name;
    const price = catalogItem.basePrice;

    const labels: ModelBarcodeLabelResponseDto[] = [];
    for (let i = 1; i <= dto.copies; i++) {
      labels.push({
        catalogId: catalogItem.id,
        barcodeValue: catalogItem.sku,
        title,
        specsSummary,
        locationName,
        price,
        copyNumber: i,
        totalCopies: dto.copies,
      });
    }

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'PRINT_MODEL_BARCODE_LABELS',
      module: 'inventory',
      payload: {
        catalogId: catalogItem.id,
        sku: catalogItem.sku,
        copies: dto.copies,
        locationId: location.id,
      },
      ipAddress,
    });

    return labels;
  }
}
