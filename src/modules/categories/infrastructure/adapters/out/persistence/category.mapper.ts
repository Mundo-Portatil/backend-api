import type { ComponentCategory } from '@prisma/client';
import { CategoryEntity } from '../../../../domain/entities/category.entity';

export class CategoryMapper {
  static toDomain(raw: ComponentCategory): CategoryEntity {
    return new CategoryEntity(
      raw.id,
      raw.name,
      raw.description,
      raw.active,
      raw.createdAt,
    );
  }

  static toPersistence(entity: CategoryEntity): {
    name: string;
    description: string | null;
    active: boolean;
  } {
    return {
      name: entity.name,
      description: entity.description,
      active: entity.active,
    };
  }
}
