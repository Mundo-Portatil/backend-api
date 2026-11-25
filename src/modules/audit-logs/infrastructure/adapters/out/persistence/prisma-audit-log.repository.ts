import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { AuditLogEntity } from '../../../../domain/entities/audit-log.entity';
import type {
  AuditLogFilterOptions,
  AuditLogRepositoryPort,
  PaginatedAuditLogs,
} from '../../../../domain/ports/out/audit-log-repository.port';
import { AuditLogMapper } from './audit-log.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async insert(log: AuditLogEntity): Promise<AuditLogEntity> {
    const data = AuditLogMapper.toPersistence(log);
    const created = await this.prisma.auditLog.create({
      data,
    });
    return AuditLogMapper.toDomain(created);
  }

  async findMany(filters: AuditLogFilterOptions): Promise<PaginatedAuditLogs> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (filters.module) {
      where.module = filters.module;
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.excludeAction) {
      const excluded = filters.excludeAction
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      if (excluded.length === 1) {
        where.action = { not: excluded[0] };
      } else if (excluded.length > 1) {
        where.action = { notIn: excluded };
      }
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: filters.endDate } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map(AuditLogMapper.toDomain),
      total,
      page,
      limit,
    };
  }
}
