import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../domain/ports/out/catalog-repository.port';
import { CATEGORY_REPOSITORY } from '../../../categories/domain/ports/out/category-repository.port';
import type { CategoryRepositoryPort } from '../../../categories/domain/ports/out/category-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { UpdateCatalogItemCommandDto } from '../dto/update-catalog-item-command.dto';
import type { CatalogItemResponseDto } from '../dto/catalog-item-response.dto';

@Injectable()
export class UpdateCatalogItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    id: string,
    dto: UpdateCatalogItemCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<CatalogItemResponseDto> {
    const existing = await this.catalogRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Catalog item with ID "${id}" not found`);
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new BadRequestException(`Category with ID "${dto.categoryId}" not found`);
      }
      if (!category.active) {
        throw new BadRequestException(`Category "${category.name}" is inactive`);
      }
    }

    const updatedEntity = existing.updateDetails(dto);
    const saved = await this.catalogRepository.update(updatedEntity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'UPDATE_CATALOG_ITEM',
      module: 'catalog',
      payload: {
        id: saved.id,
        changes: dto,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      sku: saved.sku,
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
