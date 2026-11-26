export interface AvailableSerialResponseDto {
  id: string;
  serialNumber: string;
  color?: string | null;
  companyId?: string;
  companyName?: string | null;
  companyRuc?: string | null;
  catalogId: string;
  locationId: string;
  salePrice: number | null;
  createdAt: Date;
}
