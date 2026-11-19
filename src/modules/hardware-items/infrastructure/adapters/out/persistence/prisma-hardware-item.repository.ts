import { Injectable } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { HardwareItemEntity } from '../../../../domain/entities/hardware-item.entity';
import type {
  HardwareItemFilterOptions,
  HardwareItemRepositoryPort,
  HardwareLifecycleEvent,
} from '../../../../domain/ports/out/hardware-item-repository.port';
import { HardwareItemMapper } from './hardware-item.mapper';

@Injectable()
export class PrismaHardwareItemRepository implements HardwareItemRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(item: HardwareItemEntity): Promise<HardwareItemEntity> {
    const data = HardwareItemMapper.toPersistence(item);
    const created = await this.prisma.hardwareItem.create({
      data,
      include: {
        components: true,
        parentChassis: true,
      },
    });
    return HardwareItemMapper.toDomain(created);
  }

  async saveMany(items: HardwareItemEntity[]): Promise<HardwareItemEntity[]> {
    const createdList: HardwareItemEntity[] = [];
    for (const item of items) {
      const saved = await this.save(item);
      createdList.push(saved);
    }
    return createdList;
  }

  async findById(
    id: string,
    includeRelations?: { parent?: boolean; components?: boolean },
  ): Promise<HardwareItemEntity | null> {
    const found = await this.prisma.hardwareItem.findUnique({
      where: { id },
      include: {
        parentChassis: includeRelations?.parent ?? false,
        components: includeRelations?.components ?? false,
      },
    });
    return found ? HardwareItemMapper.toDomain(found) : null;
  }

  async findBySerialNumber(
    serial: string,
    includeRelations?: { parent?: boolean; components?: boolean },
  ): Promise<HardwareItemEntity | null> {
    const found = await this.prisma.hardwareItem.findUnique({
      where: { serialNumber: serial.trim().toUpperCase() },
      include: {
        parentChassis: includeRelations?.parent ?? false,
        components: includeRelations?.components ?? false,
      },
    });
    return found ? HardwareItemMapper.toDomain(found) : null;
  }

  async findExistingSerials(serials: string[]): Promise<string[]> {
    if (!serials || serials.length === 0) return [];
    const upperSerials = serials.map((s) => s.trim().toUpperCase());
    const records = await this.prisma.hardwareItem.findMany({
      where: {
        serialNumber: {
          in: upperSerials,
        },
      },
      select: {
        serialNumber: true,
      },
    });
    return records.map((r) => r.serialNumber);
  }

  async findAll(options?: HardwareItemFilterOptions): Promise<{ items: HardwareItemEntity[]; total: number }> {
    const where: Prisma.HardwareItemWhereInput = {};

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

    if (options?.status) {
      where.status = options.status as ItemStatus;
    }

    if (options?.condition) {
      const isSecondHand = options.condition === 'usado';
      where.catalog = {
        ...(where.catalog as Prisma.ProductCatalogWhereInput),
        isSecondHand,
      };
    }

    if (options?.onlyParents) {
      where.parentChassisId = null;
    }

    if (options?.search) {
      const search = options.search.trim();
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        {
          catalog: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.hardwareItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          components: true,
          parentChassis: true,
        },
      }),
      this.prisma.hardwareItem.count({ where }),
    ]);

    return {
      items: records.map(HardwareItemMapper.toDomain),
      total,
    };
  }

  async update(item: HardwareItemEntity): Promise<HardwareItemEntity> {
    const data = HardwareItemMapper.toPersistence(item);
    const updated = await this.prisma.hardwareItem.update({
      where: { id: item.id },
      data,
      include: {
        components: true,
        parentChassis: true,
      },
    });
    return HardwareItemMapper.toDomain(updated);
  }

  async updateMany(items: HardwareItemEntity[]): Promise<void> {
    for (const item of items) {
      await this.update(item);
    }
  }

  async findLifecycleEvents(itemId: string, serialNumber: string): Promise<HardwareLifecycleEvent[]> {
    // 1. Audit logs matching itemId or serialNumber in payload
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { payload: { path: ['id'], equals: itemId } },
          { payload: { path: ['itemId'], equals: itemId } },
          { payload: { path: ['hardwareItemId'], equals: itemId } },
          { payload: { path: ['serialNumber'], equals: serialNumber } },
          { payload: { path: ['serials'], array_contains: serialNumber } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      module: log.module,
      timestamp: log.createdAt,
      userId: log.userId,
      userName: log.user?.name ?? null,
      payload: log.payload,
      ipAddress: log.ipAddress,
    }));
  }
}
