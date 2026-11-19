import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { QuantityStockEntity } from '../../../../domain/entities/quantity-stock.entity';
import type {
  QuantityStockFilterOptions,
  QuantityStockRepositoryPort,
  QuantityStockWithCatalog,
} from '../../../../domain/ports/out/quantity-stock-repository.port';
import { QuantityStockMapper } from './quantity-stock.mapper';

@Injectable()
export class PrismaQuantityStockRepository implements QuantityStockRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(stock: QuantityStockEntity): Promise<QuantityStockEntity> {
    const data = QuantityStockMapper.toPersistence(stock);
    const created = await this.prisma.quantityStock.create({
      data,
    });
    return QuantityStockMapper.toDomain(created);
  }

  async findByCatalogAndLocation(
    catalogId: string,
    locationId: string,
  ): Promise<QuantityStockEntity | null> {
    const found = await this.prisma.quantityStock.findUnique({
      where: {
        catalogId_locationId: {
          catalogId,
          locationId,
        },
      },
    });
    return found ? QuantityStockMapper.toDomain(found) : null;
  }

  async findById(id: string): Promise<QuantityStockEntity | null> {
    const found = await this.prisma.quantityStock.findUnique({
      where: { id },
    });
    return found ? QuantityStockMapper.toDomain(found) : null;
  }

  async findAll(options?: QuantityStockFilterOptions): Promise<{ items: QuantityStockWithCatalog[]; total: number }> {
    const where: Prisma.QuantityStockWhereInput = {};

    if (options?.locationId) {
      where.locationId = options.locationId;
    }

    if (options?.catalogItemId) {
      where.catalogId = options.catalogItemId;
    }

    if (options?.categoryId) {
      where.catalog = {
        categoryId: options.categoryId,
      };
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.quantityStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          catalog: true,
          location: true,
        },
      }),
      this.prisma.quantityStock.count({ where }),
    ]);

    let mapped = records.map((record) => ({
      stock: QuantityStockMapper.toDomain(record),
      catalogName: record.catalog.name,
      catalogSku: record.catalog.sku,
      minStockThreshold: record.catalog.minStockThreshold,
      locationName: record.location.name,
    }));

    if (options?.lowStock) {
      mapped = mapped.filter((item) => item.stock.quantity <= item.minStockThreshold);
    }

    return {
      items: mapped,
      total: options?.lowStock ? mapped.length : total,
    };
  }

  async update(stock: QuantityStockEntity): Promise<QuantityStockEntity> {
    const data = QuantityStockMapper.toPersistence(stock);
    const updated = await this.prisma.quantityStock.update({
      where: { id: stock.id },
      data,
    });
    return QuantityStockMapper.toDomain(updated);
  }

  async upsert(
    catalogId: string,
    locationId: string,
    incrementBy: number,
    costPrice?: number,
    salePrice?: number,
  ): Promise<QuantityStockEntity> {
    const upserted = await this.prisma.quantityStock.upsert({
      where: {
        catalogId_locationId: {
          catalogId,
          locationId,
        },
      },
      create: {
        catalogId,
        locationId,
        quantity: incrementBy,
        costPrice: costPrice !== undefined ? costPrice : null,
        salePrice: salePrice !== undefined ? salePrice : null,
      },
      update: {
        quantity: { increment: incrementBy },
        costPrice: costPrice !== undefined ? costPrice : undefined,
        salePrice: salePrice !== undefined ? salePrice : undefined,
      },
    });

    return QuantityStockMapper.toDomain(upserted);
  }
}
