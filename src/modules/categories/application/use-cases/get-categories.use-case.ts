import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../domain/ports/out/category-repository.port';
import type { CategoryRepositoryPort } from '../../domain/ports/out/category-repository.port';
import type { CategoryResponseDto } from '../dto/category-response.dto';

@Injectable()
export class GetCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepositoryPort,
  ) {}

  async execute(active?: boolean): Promise<CategoryResponseDto[]> {
    const results = await this.categoryRepository.findAll(
      active !== undefined ? { active } : undefined,
    );

    return results.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      description: item.category.description,
      active: item.category.active,
      productsCount: item.productsCount,
      createdAt: item.category.createdAt,
    }));
  }
}
