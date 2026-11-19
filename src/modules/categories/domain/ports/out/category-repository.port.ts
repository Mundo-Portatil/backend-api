import { CategoryEntity } from '../../entities/category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryWithProductCount {
  category: CategoryEntity;
  productsCount: number;
}

export interface CategoryRepositoryPort {
  save(category: CategoryEntity): Promise<CategoryEntity>;
  findById(id: string): Promise<CategoryEntity | null>;
  findByName(name: string): Promise<CategoryEntity | null>;
  findAll(options?: { active?: boolean }): Promise<CategoryWithProductCount[]>;
  update(category: CategoryEntity): Promise<CategoryEntity>;
}
