import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../domain/ports/out/catalog-repository.port';
import type { CatalogDetailResponseDto } from '../dto/catalog-detail-response.dto';

@Injectable()
export class GetCatalogItemDetailUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
  ) {}

  async execute(id: string): Promise<CatalogDetailResponseDto> {
    const detail = await this.catalogRepository.findDetailWithStockSummary(id);
    if (!detail) {
      throw new NotFoundException(`Catalog item with ID "${id}" not found`);
    }

    return {
      item: {
        id: detail.item.id,
        sku: detail.item.sku,
        brand: detail.item.brand,
        model: detail.item.model,
        categoryId: detail.item.categoryId,
        processor: detail.item.processor,
        ramCapacity: detail.item.ramCapacity,
        storageCapacity: detail.item.storageCapacity,
        gpu: detail.item.gpu,
        screenSize: detail.item.screenSize,
        isSerialized: detail.item.isSerialized,
        minStockThreshold: detail.item.minStockThreshold,
        basePrice: detail.item.basePrice,
        isSecondHand: detail.item.isSecondHand,
        active: detail.item.active,
        createdAt: detail.item.createdAt,
      },
      categoryName: detail.categoryName,
      stockSummary: detail.stockSummary,
      totalStockOverall: detail.totalStockOverall,
    };
  }
}
