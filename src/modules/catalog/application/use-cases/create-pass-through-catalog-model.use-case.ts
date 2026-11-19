import {
  BadRequestException,
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
import type { CreatePassThroughCatalogModelCommandDto } from '../dto/create-pass-through-catalog-model-command.dto';
import type { CatalogItemResponseDto } from '../dto/catalog-item-response.dto';

@Injectable()
export class CreatePassThroughCatalogModelUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: CreatePassThroughCatalogModelCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<CatalogItemResponseDto> {
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category || !category.active) {
      throw new BadRequestException('A valid, active category is required');
    }

    const cleanModel = dto.tempModelName.trim().toUpperCase().replace(/\s+/g, '-');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedSku = `PASE-${cleanModel}-${randomSuffix}`;

    const entity = CatalogItemEntity.create({
      sku: generatedSku,
      name: dto.tempModelName.trim(),
      brand: dto.brand?.trim() || 'GENÉRICO',
      model: dto.tempModelName.trim(),
      categoryId: dto.categoryId,
      isSerialized: true,
      minStockThreshold: 0,
      basePrice: dto.salePrice,
      isSecondHand: false,
      active: true,
    });

    const saved = await this.catalogRepository.save(entity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'CREATE_PASS_THROUGH_CATALOG_MODEL',
      module: 'catalog',
      payload: {
        id: saved.id,
        sku: saved.sku,
        name: saved.name,
        sourceVendor: dto.sourceVendor,
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
