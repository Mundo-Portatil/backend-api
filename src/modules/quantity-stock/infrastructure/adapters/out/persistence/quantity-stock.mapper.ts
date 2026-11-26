import type { QuantityStock } from '@prisma/client';
import { QuantityStockEntity } from '../../../../domain/entities/quantity-stock.entity';

export class QuantityStockMapper {
  static toDomain(raw: QuantityStock): QuantityStockEntity {
    return new QuantityStockEntity(
      raw.id,
      raw.catalogId,
      raw.locationId,
      raw.companyId,
      raw.quantity,
      raw.costPrice ? Number(raw.costPrice) : null,
      raw.salePrice ? Number(raw.salePrice) : null,
      raw.updatedAt,
    );
  }

  static toPersistence(entity: QuantityStockEntity): {
    catalogId: string;
    locationId: string;
    companyId: string;
    quantity: number;
    costPrice: number | null;
    salePrice: number | null;
  } {
    return {
      catalogId: entity.catalogId,
      locationId: entity.locationId,
      companyId: entity.companyId,
      quantity: entity.quantity,
      costPrice: entity.costPrice,
      salePrice: entity.salePrice,
    };
  }
}
