import { Injectable } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { HardwareItemEntity, ItemStatusType } from '../../../../domain/entities/hardware-item.entity';
import type {
  HardwareItemFilterOptions,
  HardwareItemRepositoryPort,
  HardwareLifecycleEvent,
} from '../../../../domain/ports/out/hardware-item-repository.port';
import { HardwareItemMapper } from './hardware-item.mapper';

type PrismaClientOrTx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PrismaHardwareItemRepository implements HardwareItemRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): PrismaClientOrTx {
    return (tx as Prisma.TransactionClient) || this.prisma;
  }

  async save(item: HardwareItemEntity, tx?: unknown): Promise<HardwareItemEntity> {
    const client = this.getClient(tx);
    const data = HardwareItemMapper.toPersistence(item);
    const created = await client.hardwareItem.create({
      data,
      include: {
        components: true,
        parentChassis: true,
        company: true,
      },
    });
    return HardwareItemMapper.toDomain(created);
  }

  async saveMany(items: HardwareItemEntity[], tx?: unknown): Promise<HardwareItemEntity[]> {
    const createdList: HardwareItemEntity[] = [];
    for (const item of items) {
      const saved = await this.save(item, tx);
      createdList.push(saved);
    }
    return createdList;
  }

  async findById(
    id: string,
    includeRelations?: { parent?: boolean; components?: boolean },
    tx?: unknown,
  ): Promise<HardwareItemEntity | null> {
    const client = this.getClient(tx);
    const found = await client.hardwareItem.findUnique({
      where: { id },
      include: {
        parentChassis: includeRelations?.parent ?? false,
        components: includeRelations?.components ?? false,
        company: true,
      },
    });
    return found ? HardwareItemMapper.toDomain(found) : null;
  }

  async findBySerialNumber(
    serial: string,
    includeRelations?: { parent?: boolean; components?: boolean },
    tx?: unknown,
  ): Promise<HardwareItemEntity | null> {
    const client = this.getClient(tx);
    const found = await client.hardwareItem.findUnique({
      where: { serialNumber: serial.trim().toUpperCase() },
      include: {
        parentChassis: includeRelations?.parent ?? false,
        components: includeRelations?.components ?? false,
        company: true,
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

    if (options?.companyId) {
      where.companyId = options.companyId;
    }

    if (options?.color) {
      where.color = {
        contains: options.color.trim(),
        mode: 'insensitive',
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
        { color: { contains: search, mode: 'insensitive' } },
        {
          catalog: {
            OR: [
              { model: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { processor: { contains: search, mode: 'insensitive' } },
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
          company: true,
        },
      }),
      this.prisma.hardwareItem.count({ where }),
    ]);

    return {
      items: records.map(HardwareItemMapper.toDomain),
      total,
    };
  }

  async countByCatalogAndLocationAndStatus(
    catalogId: string,
    locationId: string,
    status: ItemStatusType,
    companyId?: string,
    tx?: unknown,
  ): Promise<number> {
    const client = this.getClient(tx);
    const where: Prisma.HardwareItemWhereInput = {
      catalogId,
      locationId,
      status: status as ItemStatus,
    };
    if (companyId) {
      where.companyId = companyId;
    }
    return client.hardwareItem.count({
      where,
    });
  }

  async update(item: HardwareItemEntity, tx?: unknown): Promise<HardwareItemEntity> {
    const client = this.getClient(tx);
    const data = HardwareItemMapper.toPersistence(item);
    const updated = await client.hardwareItem.update({
      where: { id: item.id },
      data,
      include: {
        components: true,
        parentChassis: true,
        company: true,
      },
    });
    return HardwareItemMapper.toDomain(updated);
  }

  async updateMany(items: HardwareItemEntity[], tx?: unknown): Promise<void> {
    for (const item of items) {
      await this.update(item, tx);
    }
  }

  async findLifecycleEvents(itemId: string, serialNumber: string): Promise<HardwareLifecycleEvent[]> {
    const upperSerial = serialNumber.trim().toUpperCase();

    const rawLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          {
            payload: {
              path: ['itemId'],
              equals: itemId,
            },
          },
          {
            payload: {
              path: ['id'],
              equals: itemId,
            },
          },
          {
            payload: {
              path: ['serialNumber'],
              equals: upperSerial,
            },
          },
          {
            payload: {
              path: ['serials'],
              array_contains: upperSerial,
            },
          },
          {
            payload: {
              path: ['hardwareItemIds'],
              array_contains: itemId,
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return rawLogs.map((log) => ({
      id: log.id,
      action: log.action,
      module: log.module,
      timestamp: log.createdAt,
      userId: log.userId,
      userName: log.user?.name ?? null,
      payload: log.payload,
      ipAddress: log.ipAddress,
      description: `Evento [${log.action}] en módulo [${log.module}]`,
    }));
  }
}
