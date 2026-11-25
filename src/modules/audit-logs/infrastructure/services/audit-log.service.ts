import { Injectable } from '@nestjs/common';
import type {
  AuditLogEntry,
  AuditLogPort,
} from '../../../../shared/domain/ports/audit-log.port';
import { RecordAuditLogUseCase } from '../../application/use-cases/record-audit-log.use-case';

@Injectable()
export class AuditLogService implements AuditLogPort {
  constructor(private readonly recordAuditLogUseCase: RecordAuditLogUseCase) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.recordAuditLogUseCase.execute(entry);
  }

  async log(data: {
    userId?: string;
    action: string;
    module: string;
    payload?: unknown;
    ipAddress?: string;
  }): Promise<void> {
    await this.record({
      userId: data.userId,
      action: data.action,
      module: data.module,
      payload: data.payload,
      ipAddress: data.ipAddress,
    });
  }
}
