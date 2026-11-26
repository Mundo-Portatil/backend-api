export interface CreateDirectTransferCommandDto {
  fromLocationId: string;
  toLocationId: string;
  hardwareItemIds?: string[];
  quantities?: Array<{
    catalogId: string;
    companyId: string;
    quantity: number;
  }>;
  notes?: string;
}
