import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../../domain/ports/out/audit-log-repository.port';
import type { AuditLogRepositoryPort } from '../../domain/ports/out/audit-log-repository.port';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import type { CreateAuditLogDto } from '../dto/create-audit-log.dto';

@Injectable()
export class RecordAuditLogUseCase {
  private readonly logger = new Logger(RecordAuditLogUseCase.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepositoryPort,
  ) {}

  async execute(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entity = AuditLogEntity.create(dto);
      await this.auditLogRepository.insert(entity);
    } catch (error) {
      this.logger.error(
        `Failed to record audit log for action: ${dto.action} in module: ${dto.module}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
