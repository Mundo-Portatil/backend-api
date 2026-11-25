import { ServiceOrderStatusType } from '../../domain/entities/technical-service-order.entity';

export interface QueryServiceOrdersDto {
  locationId?: string;
  status?: ServiceOrderStatusType;
  search?: string;
  page?: number;
  limit?: number;
  userRole: string;
  userLocationId?: string | null;
}
