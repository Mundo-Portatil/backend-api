import { Global, Module } from '@nestjs/common';
import { AUDIT_LOG_PORT } from '../../shared/domain/ports/audit-log.port';
import { AUDIT_LOG_REPOSITORY } from './domain/ports/out/audit-log-repository.port';
import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';
import { GetAuditLogsUseCase } from './application/use-cases/get-audit-logs.use-case';
import { PrismaAuditLogRepository } from './infrastructure/adapters/out/persistence/prisma-audit-log.repository';
import { AuditLogService } from './infrastructure/services/audit-log.service';
import { AuditLogsController } from './infrastructure/adapters/in/http/audit-logs.controller';

@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [
    RecordAuditLogUseCase,
    GetAuditLogsUseCase,
    AuditLogService,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: PrismaAuditLogRepository,
    },
    {
      provide: AUDIT_LOG_PORT,
      useClass: AuditLogService,
    },
  ],
  exports: [AUDIT_LOG_PORT, AuditLogService],
})
export class AuditLogsModule {}
