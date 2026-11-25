export interface QueryAuditLogsDto {
  module?: string;
  userId?: string;
  excludeAction?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
