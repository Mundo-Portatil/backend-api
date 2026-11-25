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

type PrismaClientOrTx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PrismaQuantityStockRepository implements QuantityStockRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): PrismaClientOrTx {
    return (tx as Prisma.TransactionClient) || this.prisma;
  }

  async save(stock: QuantityStockEntity, tx?: unknown): Promise<QuantityStockEntity> {
    const client = this.getClient(tx);
    const data = QuantityStockMapper.toPersistence(stock);
    const created = await client.quantityStock.create({
      data,
    });
    return QuantityStockMapper.toDomain(created);
  }

  async findByCatalogAndLocation(
    catalogId: string,
    locationId: string,
    tx?: unknown,
  ): Promise<QuantityStockEntity | null> {
    const client = this.getClient(tx);
    const found = await client.quantityStock.findUnique({
      where: {
        catalogId_locationId: {
          catalogId,
          locationId,
        },
      },
    });
    return found ? QuantityStockMapper.toDomain(found) : null;
  }

  async findById(id: string, tx?: unknown): Promise<QuantityStockEntity | null> {
    const client = this.getClient(tx);
    const found = await client.quantityStock.findUnique({
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
      catalogBrand: record.catalog.brand,
      catalogModel: record.catalog.model,
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

  async update(stock: QuantityStockEntity, tx?: unknown): Promise<QuantityStockEntity> {
    const client = this.getClient(tx);
    const data = QuantityStockMapper.toPersistence(stock);
    const updated = await client.quantityStock.update({
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
    tx?: unknown,
  ): Promise<QuantityStockEntity> {
    const client = this.getClient(tx);
    const upserted = await client.quantityStock.upsert({
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
