export interface AvailableSerialResponseDto {
  id: string;
  serialNumber: string;
  catalogId: string;
  locationId: string;
  salePrice: number | null;
  createdAt: Date;
}
