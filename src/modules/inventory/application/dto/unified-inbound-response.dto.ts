export interface InboundItemResultDto {
  catalogId: string;
  catalogSku: string;
  catalogBrand: string;
  catalogModel: string;
  quantity: number;
  hasSerialNumbers: boolean;
  serialsCreated: string[];
  totalStockResulting: number;
}

export interface UnifiedInboundResponseDto {
  batchId: string;
  locationId: string;
  locationName: string;
  totalItems: number;
  totalUnits: number;
  results: InboundItemResultDto[];
  createdAt: Date;
}
