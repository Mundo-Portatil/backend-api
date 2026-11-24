import type { TransferStatusType, TransferTypeType } from '../../domain/entities/internal-transfer.entity';

export interface QueryTransfersDto {
  status?: TransferStatusType;
  type?: TransferTypeType;
  fromLocationId?: string;
  toLocationId?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
}
