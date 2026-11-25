export interface PrintModelBarcodeLabelsCommandDto {
  catalogId: string;
  copies: number;
  locationId?: string;
}
