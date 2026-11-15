import { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(raw: PrismaUser): UserEntity {
    return new UserEntity(
      raw.id,
      raw.email,
      raw.name,
      raw.password,
      raw.role,
      raw.active,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistenceCreate(entity: UserEntity) {
    return {
      email: entity.email,
      name: entity.name,
      password: entity.password,
      role: entity.role,
      active: entity.active,
    };
  }

  static toPersistenceUpdate(data: Partial<UserEntity>) {
    return {
      name: data.name,
      role: data.role,
      active: data.active,
      password: data.password,
    };
  }
}
