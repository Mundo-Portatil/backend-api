import { HardwareItemEntity, ItemStatusType } from '../../entities/hardware-item.entity';

export const HARDWARE_ITEM_REPOSITORY = Symbol('HARDWARE_ITEM_REPOSITORY');

export interface HardwareItemFilterOptions {
  locationId?: string;
  categoryId?: string;
  catalogItemId?: string;
  status?: ItemStatusType;
  condition?: 'nuevo' | 'usado';
  search?: string;
  onlyParents?: boolean;
  page?: number;
  limit?: number;
}

export interface HardwareLifecycleEvent {
  id: string;
  action: string;
  module: string;
  timestamp: Date;
  userId?: string | null;
  userName?: string | null;
  payload: unknown;
  ipAddress?: string | null;
}

export interface HardwareItemRepositoryPort {
  save(item: HardwareItemEntity): Promise<HardwareItemEntity>;
  saveMany(items: HardwareItemEntity[]): Promise<HardwareItemEntity[]>;
  findById(
    id: string,
    includeRelations?: { parent?: boolean; components?: boolean },
  ): Promise<HardwareItemEntity | null>;
  findBySerialNumber(
    serial: string,
    includeRelations?: { parent?: boolean; components?: boolean },
  ): Promise<HardwareItemEntity | null>;
  findExistingSerials(serials: string[]): Promise<string[]>;
  findAll(options?: HardwareItemFilterOptions): Promise<{ items: HardwareItemEntity[]; total: number }>;
  update(item: HardwareItemEntity): Promise<HardwareItemEntity>;
  updateMany(items: HardwareItemEntity[]): Promise<void>;
  findLifecycleEvents(itemId: string, serialNumber: string): Promise<HardwareLifecycleEvent[]>;
}
