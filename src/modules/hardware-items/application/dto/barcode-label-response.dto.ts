export interface BarcodeLabelResponseDto {
  hardwareItemId: string;
  barcodeValue: string;
  title: string;
  specsSummary: string;
  locationName: string;
  price: number | null;
}
