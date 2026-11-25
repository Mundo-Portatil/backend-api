import { Module } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from './domain/ports/out/category-repository.port';
import { PrismaCategoryRepository } from './infrastructure/adapters/out/persistence/prisma-category.repository';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { GetCategoriesUseCase } from './application/use-cases/get-categories.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { CategoriesController } from './infrastructure/adapters/in/http/categories.controller';

@Module({
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    GetCategoriesUseCase,
    UpdateCategoryUseCase,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [
    CATEGORY_REPOSITORY,
    CreateCategoryUseCase,
    GetCategoriesUseCase,
    UpdateCategoryUseCase,
  ],
})
export class CategoriesModule {}
