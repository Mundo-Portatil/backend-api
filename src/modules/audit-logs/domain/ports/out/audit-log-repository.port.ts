import { AuditLogEntity } from '../../entities/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogFilterOptions {
  module?: string;
  userId?: string;
  excludeAction?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  items: AuditLogEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogRepositoryPort {
  insert(log: AuditLogEntity): Promise<AuditLogEntity>;
  findMany(filters: AuditLogFilterOptions): Promise<PaginatedAuditLogs>;
}
