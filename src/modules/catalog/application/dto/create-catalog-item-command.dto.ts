export interface CreateCatalogItemCommandDto {
  sku?: string;
  brand: string;
  model: string;
  categoryId: string;
  processor?: string;
  ramCapacity?: string;
  storageCapacity?: string;
  gpu?: string;
  screenSize?: string;
  isSerialized?: boolean;
  minStockThreshold?: number;
  basePrice: number;
  isSecondHand?: boolean;
  active?: boolean;
}
