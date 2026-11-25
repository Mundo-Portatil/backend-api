import type { ItemStatusType } from '../../domain/entities/hardware-item.entity';

export interface HardwareItemResponseDto {
  id: string;
  serialNumber: string;
  catalogId: string;
  catalogName?: string;
  catalogSku?: string;
  locationId: string;
  locationName?: string;
  status: ItemStatusType;
  parentChassisId: string | null;
  costPrice: number | null;
  salePrice: number | null;
  isSecondHand?: boolean;
  createdAt: Date;
  updatedAt: Date;
  components?: HardwareItemResponseDto[];
  parentChassis?: HardwareItemResponseDto | null;
}
