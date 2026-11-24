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
  description?: string | null;
}

export interface HardwareItemRepositoryPort {
  save(item: HardwareItemEntity, tx?: unknown): Promise<HardwareItemEntity>;
  saveMany(items: HardwareItemEntity[], tx?: unknown): Promise<HardwareItemEntity[]>;
  findById(
    id: string,
    includeRelations?: { parent?: boolean; components?: boolean },
    tx?: unknown,
  ): Promise<HardwareItemEntity | null>;
  findBySerialNumber(
    serial: string,
    includeRelations?: { parent?: boolean; components?: boolean },
    tx?: unknown,
  ): Promise<HardwareItemEntity | null>;
  findExistingSerials(serials: string[]): Promise<string[]>;
  findAll(options?: HardwareItemFilterOptions): Promise<{ items: HardwareItemEntity[]; total: number }>;
  countByCatalogAndLocationAndStatus(
    catalogId: string,
    locationId: string,
    status: ItemStatusType,
    tx?: unknown,
  ): Promise<number>;
  update(item: HardwareItemEntity, tx?: unknown): Promise<HardwareItemEntity>;
  updateMany(items: HardwareItemEntity[], tx?: unknown): Promise<void>;
  findLifecycleEvents(itemId: string, serialNumber: string): Promise<HardwareLifecycleEvent[]>;
}
