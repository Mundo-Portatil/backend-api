import { AuditLog as PrismaAuditLog, Prisma } from '@prisma/client';
import { AuditLogEntity } from '../../../../domain/entities/audit-log.entity';

export class AuditLogMapper {
  static toDomain(raw: PrismaAuditLog): AuditLogEntity {
    return new AuditLogEntity(
      raw.id,
      raw.userId,
      raw.action,
      raw.module,
      raw.payload,
      raw.ipAddress,
      raw.createdAt,
    );
  }

  static toPersistence(entity: AuditLogEntity): Prisma.AuditLogCreateInput {
    const payload =
      entity.payload === undefined || entity.payload === null
        ? Prisma.JsonNull
        : (entity.payload as Prisma.InputJsonValue);

    return {
      id: entity.id || undefined,
      action: entity.action,
      module: entity.module,
      payload,
      ipAddress: entity.ipAddress,
      createdAt: entity.createdAt,
      user: entity.userId ? { connect: { id: entity.userId } } : undefined,
    };
  }
}
