export interface CreateTransferItemCommandDto {
  catalogId: string;
  hardwareItemId?: string;
  quantity?: number;
}

export interface CreateTransferCommandDto {
  fromLocationId: string;
  toLocationId: string;
  status?: 'DRAFT' | 'EN_TRANSITO';
  notes?: string;
  items: CreateTransferItemCommandDto[];
}
