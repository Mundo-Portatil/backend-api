import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../../domain/ports/out/audit-log-repository.port';
import type {
  AuditLogRepositoryPort,
  PaginatedAuditLogs,
} from '../../domain/ports/out/audit-log-repository.port';
import type { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';

@Injectable()
export class GetAuditLogsUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepositoryPort,
  ) {}

  async execute(query: QueryAuditLogsDto): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, query.page ? Number(query.page) : 1);
    const limit = Math.max(1, Math.min(100, query.limit ? Number(query.limit) : 20));

    return this.auditLogRepository.findMany({
      module: query.module,
      userId: query.userId,
      excludeAction: query.excludeAction,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page,
      limit,
    });
  }
}
