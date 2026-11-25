import { ServiceOrderResponseDto } from './service-order-response.dto';
import { PaymentMethodType } from '../../domain/entities/service-order-payment.entity';
import { ReceiptTypeType } from '../../domain/entities/service-receipt.entity';

export interface ServiceItemDetailDto {
  id: string;
  catalogId: string;
  hardwareItemId: string | null;
  sourceLocationId: string;
  sourceLocationName: string | null;
  isFromOtherPuesto: boolean;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: Date;
  catalogSku: string | null;
  catalogBrand: string | null;
  catalogModel: string | null;
  serialNumber: string | null;
}

export interface ServiceOrderPaymentDetailDto {
  id: string;
  method: PaymentMethodType;
  amount: number;
  reference: string | null;
  createdAt: Date;
}

export interface ServiceReceiptDetailDto {
  id: string;
  receiptType: ReceiptTypeType;
  series: string;
  correlative: string;
  fullNumber: string;
  customerName: string;
  customerDocumentType: string;
  customerDocument: string | null;
  customerAddress: string | null;
  currency: string;
  totalAmount: number;
  issuedAt: Date;
}

export interface ServiceOrderDetailResponseDto extends ServiceOrderResponseDto {
  items: ServiceItemDetailDto[];
  payments: ServiceOrderPaymentDetailDto[];
  receipt: ServiceReceiptDetailDto | null;
}
