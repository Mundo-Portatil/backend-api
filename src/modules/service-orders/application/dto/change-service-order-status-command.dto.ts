import { ServiceOrderStatusType } from '../../domain/entities/technical-service-order.entity';

export interface ChangeServiceOrderStatusCommandDto {
  status: ServiceOrderStatusType;
  cancelReason?: string;
  userId: string;
  userRole: string;
  userLocationId?: string | null;
}
