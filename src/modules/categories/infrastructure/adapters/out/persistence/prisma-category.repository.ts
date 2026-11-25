import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { CategoryEntity } from '../../../../domain/entities/category.entity';
import type {
  CategoryRepositoryPort,
  CategoryWithProductCount,
} from '../../../../domain/ports/out/category-repository.port';
import { CategoryMapper } from './category.mapper';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(category: CategoryEntity): Promise<CategoryEntity> {
    const data = CategoryMapper.toPersistence(category);
    const created = await this.prisma.componentCategory.create({
      data,
    });
    return CategoryMapper.toDomain(created);
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const found = await this.prisma.componentCategory.findUnique({
      where: { id },
    });
    return found ? CategoryMapper.toDomain(found) : null;
  }

  async findByName(name: string): Promise<CategoryEntity | null> {
    const found = await this.prisma.componentCategory.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });
    return found ? CategoryMapper.toDomain(found) : null;
  }

  async findAll(options?: { active?: boolean }): Promise<CategoryWithProductCount[]> {
    const records = await this.prisma.componentCategory.findMany({
      where: options?.active !== undefined ? { active: options.active } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return records.map((record) => ({
      category: CategoryMapper.toDomain(record),
      productsCount: record._count.products,
    }));
  }

  async update(category: CategoryEntity): Promise<CategoryEntity> {
    const data = CategoryMapper.toPersistence(category);
    const updated = await this.prisma.componentCategory.update({
      where: { id: category.id },
      data,
    });
    return CategoryMapper.toDomain(updated);
  }
}
