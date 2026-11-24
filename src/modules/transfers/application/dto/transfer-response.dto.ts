import type { TransferStatusType, TransferTypeType } from '../../domain/entities/internal-transfer.entity';

export interface TransferItemResponseDto {
  id: string;
  catalogId: string;
  hardwareItemId: string | null;
  serialNumber: string | null;
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
  receivedById: string | null;
  receivedByName: string | null;
  notes: string | null;
  cancelReason: string | null;
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  itemsCount: number;
}
