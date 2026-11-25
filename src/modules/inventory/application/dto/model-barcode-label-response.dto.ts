export interface ModelBarcodeLabelResponseDto {
  catalogId: string;
  barcodeValue: string;
  title: string;
  specsSummary: string;
  locationName: string;
  price: number | null;
  copyNumber: number;
  totalCopies: number;
}
