import { CatalogItemEntity } from '../../entities/catalog-item.entity';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export interface CatalogFilterOptions {
  categoryId?: string;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LocationStockDetail {
  locationId: string;
  locationName: string;
  locationType: string;
  serializedCount: number;
  quantityCount: number;
  totalAvailable: number;
}

export interface CatalogItemWithStockSummary {
  item: CatalogItemEntity;
  categoryName: string;
  stockSummary: LocationStockDetail[];
  totalStockOverall: number;
}

export interface CatalogRepositoryPort {
  save(item: CatalogItemEntity): Promise<CatalogItemEntity>;
  findById(id: string): Promise<CatalogItemEntity | null>;
  findBySku(sku: string): Promise<CatalogItemEntity | null>;
  findAll(options?: CatalogFilterOptions): Promise<{ items: CatalogItemEntity[]; total: number }>;
  findDetailWithStockSummary(id: string): Promise<CatalogItemWithStockSummary | null>;
  update(item: CatalogItemEntity): Promise<CatalogItemEntity>;
}
