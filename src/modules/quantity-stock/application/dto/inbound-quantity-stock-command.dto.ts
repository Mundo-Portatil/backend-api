export interface InboundQuantityStockCommandDto {
  catalogId: string;
  locationId: string;
  companyId: string;
  quantity: number;
  costPrice?: number;
  salePrice?: number;
}
