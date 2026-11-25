import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { CATALOG_REPOSITORY } from './domain/ports/out/catalog-repository.port';
import { PrismaCatalogRepository } from './infrastructure/adapters/out/persistence/prisma-catalog.repository';
import { CreateCatalogItemUseCase } from './application/use-cases/create-catalog-item.use-case';
import { GetCatalogItemsUseCase } from './application/use-cases/get-catalog-items.use-case';
import { GetCatalogItemDetailUseCase } from './application/use-cases/get-catalog-item-detail.use-case';
import { UpdateCatalogItemUseCase } from './application/use-cases/update-catalog-item.use-case';
import { CreatePassThroughCatalogModelUseCase } from './application/use-cases/create-pass-through-catalog-model.use-case';
import { CatalogController } from './infrastructure/adapters/in/http/catalog.controller';

@Module({
  imports: [CategoriesModule],
  controllers: [CatalogController],
  providers: [
    CreateCatalogItemUseCase,
    GetCatalogItemsUseCase,
    GetCatalogItemDetailUseCase,
    UpdateCatalogItemUseCase,
    CreatePassThroughCatalogModelUseCase,
    {
      provide: CATALOG_REPOSITORY,
      useClass: PrismaCatalogRepository,
    },
  ],
  exports: [
    CATALOG_REPOSITORY,
    CreatePassThroughCatalogModelUseCase,
    GetCatalogItemDetailUseCase,
    GetCatalogItemsUseCase,
  ],
})
export class CatalogModule {}
