import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../domain/ports/out/catalog-repository.port';
import { CATEGORY_REPOSITORY } from '../../../categories/domain/ports/out/category-repository.port';
import type { CategoryRepositoryPort } from '../../../categories/domain/ports/out/category-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { CatalogItemEntity } from '../../domain/entities/catalog-item.entity';
import type { CreateCatalogItemCommandDto } from '../dto/create-catalog-item-command.dto';
import type { CatalogItemResponseDto } from '../dto/catalog-item-response.dto';

@Injectable()
export class CreateCatalogItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: CreateCatalogItemCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<CatalogItemResponseDto> {
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new BadRequestException(`Category with ID "${dto.categoryId}" not found`);
    }
    if (!category.active) {
      throw new BadRequestException(`Category "${category.name}" is inactive`);
    }

    const existingSku = await this.catalogRepository.findBySku(dto.sku);
    if (existingSku) {
      throw new ConflictException(`Catalog item with SKU "${dto.sku}" already exists`);
    }

    const entity = CatalogItemEntity.create(dto);
    const saved = await this.catalogRepository.save(entity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'CREATE_CATALOG_ITEM',
      module: 'catalog',
      payload: {
        id: saved.id,
        sku: saved.sku,
        name: saved.name,
        categoryId: saved.categoryId,
        basePrice: saved.basePrice,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      sku: saved.sku,
      name: saved.name,
      brand: saved.brand,
      model: saved.model,
      categoryId: saved.categoryId,
      processor: saved.processor,
      ramCapacity: saved.ramCapacity,
      storageCapacity: saved.storageCapacity,
      gpu: saved.gpu,
      screenSize: saved.screenSize,
      isSerialized: saved.isSerialized,
      minStockThreshold: saved.minStockThreshold,
      basePrice: saved.basePrice,
      isSecondHand: saved.isSecondHand,
      active: saved.active,
      createdAt: saved.createdAt,
    };
  }
}
