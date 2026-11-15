export interface CreateAuditLogDto {
  userId?: string | null;
  action: string;
  module: string;
  payload?: unknown;
  ipAddress?: string | null;
}
