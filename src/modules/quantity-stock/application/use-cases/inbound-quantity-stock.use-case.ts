import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { QUANTITY_STOCK_REPOSITORY } from '../../domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../domain/ports/out/quantity-stock-repository.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { InboundQuantityStockCommandDto } from '../dto/inbound-quantity-stock-command.dto';
import type { QuantityStockResponseDto } from '../dto/quantity-stock-response.dto';

@Injectable()
export class InboundQuantityStockUseCase {
  constructor(
    @Inject(QUANTITY_STOCK_REPOSITORY)
    private readonly quantityStockRepository: QuantityStockRepositoryPort,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: InboundQuantityStockCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<QuantityStockResponseDto> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Inbound quantity must be greater than zero');
    }

    const location = await this.locationRepository.findById(dto.locationId);
    if (!location || !location.active) {
      throw new BadRequestException('A valid active location is required');
    }

    const catalogItem = await this.catalogRepository.findById(dto.catalogId);
    if (!catalogItem || !catalogItem.active) {
      throw new BadRequestException('A valid active catalog item is required');
    }

    const saved = await this.quantityStockRepository.upsert(
      dto.catalogId,
      dto.locationId,
      dto.quantity,
      dto.costPrice,
      dto.salePrice ?? catalogItem.basePrice,
    );

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'INBOUND_QUANTITY_STOCK',
      module: 'quantity-stock',
      payload: {
        id: saved.id,
        catalogId: saved.catalogId,
        catalogSku: catalogItem.sku,
        locationId: saved.locationId,
        inboundQuantity: dto.quantity,
        totalResultingQuantity: saved.quantity,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice ?? catalogItem.basePrice,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      catalogId: saved.catalogId,
      catalogBrand: catalogItem.brand,
      catalogModel: catalogItem.model,
      catalogSku: catalogItem.sku,
      locationId: saved.locationId,
      locationName: location.name,
      quantity: saved.quantity,
      costPrice: saved.costPrice,
      salePrice: saved.salePrice,
      minStockThreshold: catalogItem.minStockThreshold,
      isLowStock: saved.quantity <= catalogItem.minStockThreshold,
      updatedAt: saved.updatedAt,
    };
  }
}
