import { QuantityStockEntity } from '../../entities/quantity-stock.entity';

export const QUANTITY_STOCK_REPOSITORY = Symbol('QUANTITY_STOCK_REPOSITORY');

export interface QuantityStockFilterOptions {
  locationId?: string;
  categoryId?: string;
  catalogItemId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface QuantityStockWithCatalog {
  stock: QuantityStockEntity;
  catalogName: string;
  catalogSku: string;
  minStockThreshold: number;
  locationName: string;
}

export interface QuantityStockRepositoryPort {
  save(stock: QuantityStockEntity): Promise<QuantityStockEntity>;
  findByCatalogAndLocation(catalogId: string, locationId: string): Promise<QuantityStockEntity | null>;
  findById(id: string): Promise<QuantityStockEntity | null>;
  findAll(options?: QuantityStockFilterOptions): Promise<{ items: QuantityStockWithCatalog[]; total: number }>;
  update(stock: QuantityStockEntity): Promise<QuantityStockEntity>;
  upsert(
    catalogId: string,
    locationId: string,
    incrementBy: number,
    costPrice?: number,
    salePrice?: number,
  ): Promise<QuantityStockEntity>;
}
