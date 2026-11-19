export interface AdjustQuantityStockCommandDto {
  catalogId: string;
  locationId: string;
  newQuantity: number;
  reason: string;
}
