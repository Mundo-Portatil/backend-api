export interface QuantityStockResponseDto {
  id: string;
  catalogId: string;
  catalogBrand?: string;
  catalogModel?: string;
  catalogSku?: string;
  locationId: string;
  locationName?: string;
  quantity: number;
  costPrice: number | null;
  salePrice: number | null;
  minStockThreshold?: number;
  isLowStock?: boolean;
  updatedAt: Date;
}
