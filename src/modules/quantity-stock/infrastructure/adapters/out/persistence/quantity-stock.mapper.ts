import type { QuantityStock } from '@prisma/client';
import { QuantityStockEntity } from '../../../../domain/entities/quantity-stock.entity';

export class QuantityStockMapper {
  static toDomain(raw: QuantityStock): QuantityStockEntity {
    return new QuantityStockEntity(
      raw.id,
      raw.catalogId,
      raw.locationId,
      raw.quantity,
      raw.costPrice ? Number(raw.costPrice) : null,
      raw.salePrice ? Number(raw.salePrice) : null,
      raw.updatedAt,
    );
  }

  static toPersistence(entity: QuantityStockEntity): {
    catalogId: string;
    locationId: string;
    quantity: number;
    costPrice: number | null;
    salePrice: number | null;
  } {
    return {
      catalogId: entity.catalogId,
      locationId: entity.locationId,
      quantity: entity.quantity,
      costPrice: entity.costPrice,
      salePrice: entity.salePrice,
    };
  }
}
