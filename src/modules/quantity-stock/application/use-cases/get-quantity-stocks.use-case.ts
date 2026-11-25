import { Inject, Injectable } from '@nestjs/common';
import { QUANTITY_STOCK_REPOSITORY } from '../../domain/ports/out/quantity-stock-repository.port';
import type {
  QuantityStockFilterOptions,
  QuantityStockRepositoryPort,
} from '../../domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockResponseDto } from '../dto/quantity-stock-response.dto';

@Injectable()
export class GetQuantityStocksUseCase {
  constructor(
    @Inject(QUANTITY_STOCK_REPOSITORY)
    private readonly quantityStockRepository: QuantityStockRepositoryPort,
  ) {}

  async execute(options?: QuantityStockFilterOptions): Promise<{
    items: QuantityStockResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;

    const result = await this.quantityStockRepository.findAll({
      ...options,
      page,
      limit,
    });

    return {
      items: result.items.map((item) => ({
        id: item.stock.id,
        catalogId: item.stock.catalogId,
        catalogBrand: item.catalogBrand,
        catalogModel: item.catalogModel,
        catalogSku: item.catalogSku,
        locationId: item.stock.locationId,
        locationName: item.locationName,
        quantity: item.stock.quantity,
        costPrice: item.stock.costPrice,
        salePrice: item.stock.salePrice,
        minStockThreshold: item.minStockThreshold,
        isLowStock: item.stock.quantity <= item.minStockThreshold,
        updatedAt: item.stock.updatedAt,
      })),
      total: result.total,
      page,
      limit,
    };
  }
}
