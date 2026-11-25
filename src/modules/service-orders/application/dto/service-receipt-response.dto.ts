import { PaymentMethodType } from '../../domain/entities/service-order-payment.entity';

export interface ServiceReceiptItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ServiceReceiptPaymentDto {
  method: PaymentMethodType;
  amount: number;
  reference: string | null;
}

export interface ServiceReceiptResponseDto {
  businessName: string;
  locationName: string;
  fullNumber: string;
  issuedAt: Date;
  orderCode: string;
  technicianName: string;
  customer: {
    name: string;
    documentType: string;
    document: string | null;
    address: string | null;
    phone: string | null;
  };
  device: {
    brand: string;
    model: string;
    serial: string | null;
    accessories: string | null;
    reportedIssue: string;
  };
  items: ServiceReceiptItemDto[];
  currency: string;
  totalAmount: number;
  payments: ServiceReceiptPaymentDto[];
}
