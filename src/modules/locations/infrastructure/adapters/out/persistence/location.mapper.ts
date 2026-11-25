import { Location as PrismaLocation } from '@prisma/client';
import { LocationEntity } from '../../../../domain/entities/location.entity';

export class LocationMapper {
  static toDomain(raw: PrismaLocation): LocationEntity {
    return new LocationEntity(
      raw.id,
      raw.name,
      raw.type,
      raw.active,
      raw.createdAt,
    );
  }

  static toPersistenceCreate(entity: LocationEntity) {
    return {
      name: entity.name,
      type: entity.type,
      active: entity.active,
    };
  }

  static toPersistenceUpdate(data: Partial<LocationEntity>) {
    return {
      name: data.name,
      active: data.active,
    };
  }
}
