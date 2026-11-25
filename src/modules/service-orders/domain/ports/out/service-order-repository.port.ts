import {
  TechnicalServiceOrderEntity,
  ServiceOrderStatusType,
} from '../../entities/technical-service-order.entity';
import { ServiceItemEntity } from '../../entities/service-item.entity';
import { ServiceOrderPaymentEntity } from '../../entities/service-order-payment.entity';
import { ServiceReceiptEntity } from '../../entities/service-receipt.entity';

export const SERVICE_ORDER_REPOSITORY = Symbol('SERVICE_ORDER_REPOSITORY');

export interface QueryServiceOrdersFilter {
  locationId?: string;
  technicianId?: string;
  status?: ServiceOrderStatusType;
  search?: string; // Búsqueda parcial en code, customerName, customerDocument, customerPhone, deviceBrand, deviceModel, deviceSerial
  page?: number;
  limit?: number;
}

export interface ServiceOrderRepositoryPort {
  save(order: TechnicalServiceOrderEntity, tx?: unknown): Promise<TechnicalServiceOrderEntity>;
  findById(id: string, tx?: unknown): Promise<TechnicalServiceOrderEntity | null>;
  findByCode(code: string, tx?: unknown): Promise<TechnicalServiceOrderEntity | null>;
  findAll(filter: QueryServiceOrdersFilter): Promise<{
    orders: TechnicalServiceOrderEntity[];
    total: number;
    countsByStatus: Record<ServiceOrderStatusType, number>;
  }>;
  addItem(item: ServiceItemEntity, tx?: unknown): Promise<ServiceItemEntity>;
  removeItem(itemId: string, tx?: unknown): Promise<void>;
  findItemById(itemId: string, tx?: unknown): Promise<ServiceItemEntity | null>;
  savePayment(payment: ServiceOrderPaymentEntity, tx?: unknown): Promise<ServiceOrderPaymentEntity>;
  saveReceipt(receipt: ServiceReceiptEntity, tx?: unknown): Promise<ServiceReceiptEntity>;
  findReceiptByOrderId(orderId: string, tx?: unknown): Promise<ServiceReceiptEntity | null>;
}
