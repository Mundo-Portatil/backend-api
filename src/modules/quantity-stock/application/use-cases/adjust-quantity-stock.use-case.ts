import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QUANTITY_STOCK_REPOSITORY } from '../../domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../domain/ports/out/quantity-stock-repository.port';
import { HARDWARE_ITEM_REPOSITORY } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../../hardware-items/domain/ports/out/hardware-item-repository.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { COMPANY_REPOSITORY } from '../../../companies/domain/ports/out/company-repository.port';
import type { CompanyRepositoryPort } from '../../../companies/domain/ports/out/company-repository.port';
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
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepositoryPort,
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

    const company = await this.companyRepository.findById(dto.companyId);
    if (!company) {
      throw new NotFoundException(`Empresa con ID "${dto.companyId}" no encontrada`);
    }

    const inStockCount = await this.hardwareItemRepository.countByCatalogAndLocationAndStatus(
      dto.catalogId,
      dto.locationId,
      'EN_STOCK',
      dto.companyId,
    );
    if (inStockCount > 0) {
      throw new BadRequestException(
        `No se puede realizar un ajuste manual global en este producto para la empresa "${company.name}" porque cuenta con ${inStockCount} serie(s) física(s) activa(s) en stock. El ajuste debe realizarse mediante el ciclo de vida de sus series individuales.`,
      );
    }

    let stock = await this.quantityStockRepository.findByCatalogLocationAndCompany(
      dto.catalogId,
      dto.locationId,
      dto.companyId,
    );

    const previousQuantity = stock ? stock.quantity : 0;

    if (!stock) {
      stock = QuantityStockEntity.create({
        catalogId: dto.catalogId,
        locationId: dto.locationId,
        companyId: dto.companyId,
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
        companyId: dto.companyId,
        companyName: company.name,
        companyRuc: company.ruc,
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
      catalogBrand: catalogItem.brand,
      catalogModel: catalogItem.model,
      catalogSku: catalogItem.sku,
      locationId: saved.locationId,
      locationName: location.name,
      companyId: saved.companyId,
      companyName: company.name,
      companyRuc: company.ruc,
      quantity: saved.quantity,
      costPrice: saved.costPrice,
      salePrice: saved.salePrice,
      minStockThreshold: catalogItem.minStockThreshold,
      isLowStock: saved.quantity <= catalogItem.minStockThreshold,
      updatedAt: saved.updatedAt,
    };
  }
}
