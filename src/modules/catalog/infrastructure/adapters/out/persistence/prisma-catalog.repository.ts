import { Injectable } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { CatalogItemEntity } from '../../../../domain/entities/catalog-item.entity';
import type {
  CatalogFilterOptions,
  CatalogItemWithStockSummary,
  CatalogRepositoryPort,
  LocationStockDetail,
} from '../../../../domain/ports/out/catalog-repository.port';
import { CatalogMapper } from './catalog.mapper';

@Injectable()
export class PrismaCatalogRepository implements CatalogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(item: CatalogItemEntity): Promise<CatalogItemEntity> {
    const data = CatalogMapper.toPersistence(item);
    const created = await this.prisma.productCatalog.create({
      data,
    });
    return CatalogMapper.toDomain(created);
  }

  async findById(id: string): Promise<CatalogItemEntity | null> {
    const found = await this.prisma.productCatalog.findUnique({
      where: { id },
    });
    return found ? CatalogMapper.toDomain(found) : null;
  }

  async findBySku(sku: string): Promise<CatalogItemEntity | null> {
    const found = await this.prisma.productCatalog.findUnique({
      where: { sku: sku.trim().toUpperCase() },
    });
    return found ? CatalogMapper.toDomain(found) : null;
  }

  async findAll(options?: CatalogFilterOptions): Promise<{ items: CatalogItemEntity[]; total: number }> {
    const where: Prisma.ProductCatalogWhereInput = {};

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options?.active !== undefined) {
      where.active = options.active;
    }

    if (options?.search) {
      const searchTerm = options.search.trim();
      where.OR = [
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { contains: searchTerm, mode: 'insensitive' } },
        { model: { contains: searchTerm, mode: 'insensitive' } },
        { processor: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.productCatalog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productCatalog.count({ where }),
    ]);

    return {
      items: records.map(CatalogMapper.toDomain),
      total,
    };
  }

  async findDetailWithStockSummary(id: string): Promise<CatalogItemWithStockSummary | null> {
    const catalogItem = await this.prisma.productCatalog.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!catalogItem) {
      return null;
    }

    const locations = await this.prisma.location.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    const serializedCounts = await this.prisma.hardwareItem.groupBy({
      by: ['locationId'],
      where: {
        catalogId: id,
        status: ItemStatus.EN_STOCK,
      },
      _count: {
        id: true,
      },
    });

    const serializedCountMap = new Map<string, number>();
    for (const group of serializedCounts) {
      serializedCountMap.set(group.locationId, group._count.id);
    }

    const quantityStocks = await this.prisma.quantityStock.findMany({
      where: { catalogId: id },
    });

    const quantityStockMap = new Map<string, number>();
    for (const q of quantityStocks) {
      quantityStockMap.set(q.locationId, q.quantity);
    }

    let totalStockOverall = 0;
    const stockSummary: LocationStockDetail[] = locations.map((loc) => {
      const serializedCount = serializedCountMap.get(loc.id) || 0;
      const quantityCount = quantityStockMap.get(loc.id) || 0;
      const totalAvailable = quantityCount;
      totalStockOverall += totalAvailable;

      return {
        locationId: loc.id,
        locationName: loc.name,
        locationType: loc.type,
        serializedCount,
        quantityCount,
        totalAvailable,
      };
    });

    return {
      item: CatalogMapper.toDomain(catalogItem),
      categoryName: catalogItem.category.name,
      stockSummary,
      totalStockOverall,
    };
  }

  async update(item: CatalogItemEntity): Promise<CatalogItemEntity> {
    const data = CatalogMapper.toPersistence(item);
    const updated = await this.prisma.productCatalog.update({
      where: { id: item.id },
      data,
    });
    return CatalogMapper.toDomain(updated);
  }
}
