import { ServiceOrderResponseDto } from './service-order-response.dto';
import { ServiceOrderStatusType } from '../../domain/entities/technical-service-order.entity';

export interface ServiceOrderListResponseDto {
  data: ServiceOrderResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  countsByStatus: Record<ServiceOrderStatusType, number>;
}
