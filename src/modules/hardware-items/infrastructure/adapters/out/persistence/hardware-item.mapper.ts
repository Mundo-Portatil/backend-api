import type { HardwareItem, ItemStatus } from '@prisma/client';
import {
  HardwareItemEntity,
  ItemStatusType,
} from '../../../../domain/entities/hardware-item.entity';

type HardwareItemWithRelations = HardwareItem & {
  components?: HardwareItem[];
  parentChassis?: HardwareItem | null;
};

export class HardwareItemMapper {
  static toDomain(raw: HardwareItemWithRelations): HardwareItemEntity {
    const components = raw.components ? raw.components.map((c) => HardwareItemMapper.toDomain(c)) : [];
    const parentChassis = raw.parentChassis ? HardwareItemMapper.toDomain(raw.parentChassis) : null;

    return new HardwareItemEntity(
      raw.id,
      raw.serialNumber,
      raw.catalogId,
      raw.locationId,
      raw.status as ItemStatusType,
      raw.parentChassisId,
      raw.costPrice ? Number(raw.costPrice) : null,
      raw.salePrice ? Number(raw.salePrice) : null,
      raw.createdAt,
      raw.updatedAt,
      components,
      parentChassis,
    );
  }

  static toPersistence(entity: HardwareItemEntity): {
    serialNumber: string;
    catalogId: string;
    locationId: string;
    status: ItemStatus;
    parentChassisId: string | null;
    costPrice: number | null;
    salePrice: number | null;
  } {
    return {
      serialNumber: entity.serialNumber,
      catalogId: entity.catalogId,
      locationId: entity.locationId,
      status: entity.status as ItemStatus,
      parentChassisId: entity.parentChassisId,
      costPrice: entity.costPrice,
      salePrice: entity.salePrice,
    };
  }
}
