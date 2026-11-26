export interface AdjustQuantityStockCommandDto {
  catalogId: string;
  locationId: string;
  companyId: string;
  newQuantity: number;
  reason: string;
}
