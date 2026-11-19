import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QUANTITY_STOCK_REPOSITORY } from '../../domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../domain/ports/out/quantity-stock-repository.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { QuantityStockEntity } from '../../domain/entities/quantity-stock.entity';
import type { AdjustQuantityStockCommandDto } from '../dto/adjust-quantity-stock-command.dto';
import type { QuantityStockResponseDto } from '../dto/quantity-stock-response.dto';

@Injectable()
export class AdjustQuantityStockUseCase {
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
    dto: AdjustQuantityStockCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<QuantityStockResponseDto> {
    if (dto.newQuantity < 0) {
      throw new BadRequestException('New quantity cannot be negative');
    }
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A reason is mandatory for stock adjustment');
    }

    const location = await this.locationRepository.findById(dto.locationId);
    if (!location) {
      throw new NotFoundException(`Location with ID "${dto.locationId}" not found`);
    }

    const catalogItem = await this.catalogRepository.findById(dto.catalogId);
    if (!catalogItem) {
      throw new NotFoundException(`Catalog item with ID "${dto.catalogId}" not found`);
    }

    let stock = await this.quantityStockRepository.findByCatalogAndLocation(
      dto.catalogId,
      dto.locationId,
    );

    const previousQuantity = stock ? stock.quantity : 0;

    if (!stock) {
      stock = QuantityStockEntity.create({
        catalogId: dto.catalogId,
        locationId: dto.locationId,
        quantity: dto.newQuantity,
      });
    } else {
      stock = stock.adjust(dto.newQuantity, dto.reason);
    }

    const saved = stock.id
      ? await this.quantityStockRepository.update(stock)
      : await this.quantityStockRepository.save(stock);

    const delta = dto.newQuantity - previousQuantity;

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'ADJUST_QUANTITY_STOCK',
      module: 'quantity-stock',
      payload: {
        id: saved.id,
        catalogId: dto.catalogId,
        catalogSku: catalogItem.sku,
        locationId: dto.locationId,
        previousQuantity,
        newQuantity: dto.newQuantity,
        delta,
        reason: dto.reason,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      catalogId: saved.catalogId,
      catalogName: catalogItem.name,
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
