export interface InboundQuantityStockCommandDto {
  catalogId: string;
  locationId: string;
  quantity: number;
  costPrice?: number;
  salePrice?: number;
}
