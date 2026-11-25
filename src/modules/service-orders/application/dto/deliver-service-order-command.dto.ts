import { PaymentMethodType } from '../../domain/entities/service-order-payment.entity';
import {
  CustomerDocumentTypeType,
  ReceiptTypeType,
} from '../../domain/entities/service-receipt.entity';

export interface DeliverPaymentItemDto {
  method: PaymentMethodType;
  amount: number;
  reference?: string | null;
}

export interface DeliverReceiptDataDto {
  receiptType?: ReceiptTypeType;
  customerName?: string;
  customerDocumentType?: CustomerDocumentTypeType;
  customerDocument?: string | null;
  customerAddress?: string | null;
}

export interface DeliverServiceOrderCommandDto {
  payments: DeliverPaymentItemDto[];
  receipt?: DeliverReceiptDataDto;
  userId: string;
  userRole: string;
  userLocationId?: string | null;
}
