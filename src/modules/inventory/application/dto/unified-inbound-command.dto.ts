export interface UnifiedInboundSerialEntryCommandDto {
  serialNumber: string;
  color?: string;
  companyId: string;
}

export interface UnifiedInboundItemCommandDto {
  catalogId: string;
  quantity: number;
  hasSerialNumbers: boolean;
  companyId?: string;
  serialEntries?: UnifiedInboundSerialEntryCommandDto[];
  serialNumbers?: string[]; // Compatibilidad transitoria si viene sin color/empresa
  costPrice?: number;
  salePrice?: number;
}

export interface UnifiedInboundCommandDto {
  items: UnifiedInboundItemCommandDto[];
  notes?: string;
}
