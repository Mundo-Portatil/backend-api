import type { TransferStatusType, TransferTypeType } from '../../domain/entities/internal-transfer.entity';

export interface TransferItemResponseDto {
  id: string;
  catalogId: string;
  hardwareItemId: string | null;
  serialNumber: string | null;
  companyId?: string | null;
  quantity: number;
  sku: string | null;
  model: string | null;
  brand: string | null;
}

export interface TransferResponseDto {
  id: string;
  code: string;
  type: TransferTypeType;
  status: TransferStatusType;
  fromLocationId: string;
  fromLocationName: string | null;
  toLocationId: string;
  toLocationName: string | null;
  createdById: string;
  createdByName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemsCount: number;
}
