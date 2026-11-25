export interface UnifiedInboundItemCommandDto {
  catalogId: string;
  quantity: number;
  hasSerialNumbers: boolean;
  serialNumbers?: string[];
  costPrice?: number;
  salePrice?: number;
}

export interface UnifiedInboundCommandDto {
  items: UnifiedInboundItemCommandDto[];
  notes?: string;
}
