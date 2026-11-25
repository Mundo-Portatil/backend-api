export const AUDIT_LOG_PORT = Symbol('AUDIT_LOG_PORT');

export interface AuditLogEntry {
  userId?: string;
  action: string;
  module: string;
  payload?: unknown;
  ipAddress?: string;
}

export interface AuditLogPort {
  record(entry: AuditLogEntry): Promise<void>;
}
