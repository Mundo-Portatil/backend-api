import type { HardwareItem, ItemStatus } from '@prisma/client';
import {
  HardwareItemEntity,
  ItemStatusType,
} from '../../../../domain/entities/hardware-item.entity';

type HardwareItemWithRelations = HardwareItem & {
  components?: HardwareItemWithRelations[];
  parentChassis?: HardwareItemWithRelations | null;
  company?: { name: string; ruc: string } | null;
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
      raw.companyId,
      raw.status as ItemStatusType,
      raw.color,
      raw.parentChassisId,
      raw.costPrice ? Number(raw.costPrice) : null,
      raw.salePrice ? Number(raw.salePrice) : null,
      raw.createdAt,
      raw.updatedAt,
      components,
      parentChassis,
      raw.company?.name ?? null,
      raw.company?.ruc ?? null,
    );
  }

  static toPersistence(entity: HardwareItemEntity): {
    serialNumber: string;
    catalogId: string;
    locationId: string;
    companyId: string;
    color: string | null;
    status: ItemStatus;
    parentChassisId: string | null;
    costPrice: number | null;
    salePrice: number | null;
  } {
    return {
      serialNumber: entity.serialNumber,
      catalogId: entity.catalogId,
      locationId: entity.locationId,
      companyId: entity.companyId,
      color: entity.color,
      status: entity.status as ItemStatus,
      parentChassisId: entity.parentChassisId,
      costPrice: entity.costPrice,
      salePrice: entity.salePrice,
    };
  }
}
