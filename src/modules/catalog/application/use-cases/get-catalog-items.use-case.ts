import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/ports/out/catalog-repository.port';
import type {
  CatalogFilterOptions,
  CatalogRepositoryPort,
} from '../../domain/ports/out/catalog-repository.port';
import type { CatalogItemResponseDto } from '../dto/catalog-item-response.dto';

@Injectable()
export class GetCatalogItemsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
  ) {}

  async execute(options?: CatalogFilterOptions): Promise<{
    items: CatalogItemResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;

    const result = await this.catalogRepository.findAll({
      ...options,
      page,
      limit,
    });

    return {
      items: result.items.map((saved) => ({
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
      })),
      total: result.total,
      page,
      limit,
    };
  }
}
