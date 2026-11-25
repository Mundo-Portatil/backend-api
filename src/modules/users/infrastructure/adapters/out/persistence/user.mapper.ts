import { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../../../domain/entities/user.entity';

type PrismaUserWithLocation = PrismaUser & {
  location?: { name: string } | null;
};

export class UserMapper {
  static toDomain(raw: PrismaUserWithLocation): UserEntity {
    return new UserEntity(
      raw.id,
      raw.email,
      raw.name,
      raw.password,
      raw.role,
      raw.active,
      raw.createdAt,
      raw.updatedAt,
      raw.locationId ?? null,
      raw.location?.name ?? null,
    );
  }

  static toPersistenceCreate(entity: UserEntity) {
    return {
      email: entity.email,
      name: entity.name,
      password: entity.password,
      role: entity.role,
      active: entity.active,
      locationId: entity.locationId,
    };
  }

  static toPersistenceUpdate(data: Partial<UserEntity>) {
    const res: Record<string, unknown> = {};
    if (data.email !== undefined) res.email = data.email;
    if (data.name !== undefined) res.name = data.name;
    if (data.role !== undefined) res.role = data.role;
    if (data.active !== undefined) res.active = data.active;
    if (data.password !== undefined) res.password = data.password;
    if (data.locationId !== undefined) res.locationId = data.locationId;
    return res;
  }
}
