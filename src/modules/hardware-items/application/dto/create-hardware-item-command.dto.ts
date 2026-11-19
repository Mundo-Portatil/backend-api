import type { ItemStatusType } from '../../domain/entities/hardware-item.entity';

export interface CreateHardwareItemCommandDto {
  serialNumber?: string;
  catalogId: string;
  locationId: string;
  parentChassisId?: string;
  costPrice?: number;
  salePrice?: number;
  status?: ItemStatusType;
}
