import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import {
  TransferFilterOptions,
  TransferRepositoryPort,
} from '../../../../domain/ports/out/transfer-repository.port';
import { InternalTransferEntity } from '../../../../domain/entities/internal-transfer.entity';
import { TransferMapper } from './transfer.mapper';

@Injectable()
export class PrismaTransferRepository implements TransferRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown) {
    return (tx as PrismaClient) ?? this.prisma;
  }

  private readonly standardIncludes = {
    fromLocation: { select: { name: true } },
    toLocation: { select: { name: true } },
    createdBy: { select: { name: true } },
    items: {
      include: {
        catalog: { select: { sku: true, brand: true, model: true } },
        hardwareItem: { select: { serialNumber: true } },
      },
    },
  };

  async create(
    transfer: InternalTransferEntity,
    tx?: unknown,
  ): Promise<InternalTransferEntity> {
    const client = this.getClient(tx);

    const created = await client.internalTransfer.create({
      data: {
        code: transfer.code,
        type: transfer.type,
        status: transfer.status,
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        createdById: transfer.createdById,
        notes: transfer.notes,
        items: {
          create: transfer.items.map((i) => TransferMapper.toItemPersistenceCreate(i)),
        },
      },
      include: this.standardIncludes,
    });

    return TransferMapper.toDomain(created);
  }

  async findById(id: string, tx?: unknown): Promise<InternalTransferEntity | null> {
    const client = this.getClient(tx);

    const found = await client.internalTransfer.findUnique({
      where: { id },
      include: this.standardIncludes,
    });

    return found ? TransferMapper.toDomain(found) : null;
  }

  async findByCode(code: string, tx?: unknown): Promise<InternalTransferEntity | null> {
    const client = this.getClient(tx);

    const found = await client.internalTransfer.findUnique({
      where: { code },
      include: this.standardIncludes,
    });

    return found ? TransferMapper.toDomain(found) : null;
  }

  async findAll(filter?: TransferFilterOptions): Promise<InternalTransferEntity[]> {
    const where: Record<string, unknown> = {};

    if (filter?.fromLocationId) {
      where.fromLocationId = filter.fromLocationId;
    }
    if (filter?.toLocationId) {
      where.toLocationId = filter.toLocationId;
    }
    if (filter?.locationId) {
      where.OR = [
        { fromLocationId: filter.locationId },
        { toLocationId: filter.locationId },
      ];
    }
    if (filter?.startDate || filter?.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        (where.createdAt as Record<string, unknown>).gte = filter.startDate;
      }
      if (filter.endDate) {
        (where.createdAt as Record<string, unknown>).lte = filter.endDate;
      }
    }

    const transfers = await this.prisma.internalTransfer.findMany({
      where,
      include: this.standardIncludes,
      orderBy: { createdAt: 'desc' },
    });

    return transfers.map(TransferMapper.toDomain);
  }
}
