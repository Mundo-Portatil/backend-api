import type { ProductCatalog } from '@prisma/client';
import { CatalogItemEntity } from '../../../../domain/entities/catalog-item.entity';

export class CatalogMapper {
  static toDomain(raw: ProductCatalog): CatalogItemEntity {
    return new CatalogItemEntity(
      raw.id,
      raw.sku,
      raw.name,
      raw.brand,
      raw.model,
      raw.categoryId,
      raw.processor,
      raw.ramCapacity,
      raw.storageCapacity,
      raw.gpu,
      raw.screenSize,
      raw.isSerialized,
      raw.minStockThreshold,
      Number(raw.basePrice),
      raw.isSecondHand,
      raw.active,
      raw.createdAt,
    );
  }

  static toPersistence(entity: CatalogItemEntity): {
    sku: string;
    name: string;
    brand: string;
    model: string;
    categoryId: string;
    processor: string | null;
    ramCapacity: string | null;
    storageCapacity: string | null;
    gpu: string | null;
    screenSize: string | null;
    isSerialized: boolean;
    minStockThreshold: number;
    basePrice: number;
    isSecondHand: boolean;
    active: boolean;
  } {
    return {
      sku: entity.sku,
      name: entity.name,
      brand: entity.brand,
      model: entity.model,
      categoryId: entity.categoryId,
      processor: entity.processor,
      ramCapacity: entity.ramCapacity,
      storageCapacity: entity.storageCapacity,
      gpu: entity.gpu,
      screenSize: entity.screenSize,
      isSerialized: entity.isSerialized,
      minStockThreshold: entity.minStockThreshold,
      basePrice: entity.basePrice,
      isSecondHand: entity.isSecondHand,
      active: entity.active,
    };
  }
}
