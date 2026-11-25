import {
  ReceiptTypeType,
  SunatStatusType,
  CustomerDocumentTypeType,
} from '../../entities/service-receipt.entity';

export const ELECTRONIC_BILLING_PORT = Symbol('ELECTRONIC_BILLING_PORT');

export interface IssueReceiptData {
  receiptType: ReceiptTypeType;
  series: string;
  correlative: string;
  fullNumber: string;
  customerName: string;
  customerDocumentType: CustomerDocumentTypeType;
  customerDocument?: string | null;
  customerAddress?: string | null;
  currency: string;
  subtotal: number;
  igvAmount: number;
  totalAmount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface ElectronicBillingResult {
  sunatStatus: SunatStatusType;
  sunatHash?: string | null;
  sunatCdrCode?: string | null;
  sunatXmlUrl?: string | null;
  sunatPdfUrl?: string | null;
}

export interface ElectronicBillingPort {
  issueReceipt(data: IssueReceiptData, tx?: unknown): Promise<ElectronicBillingResult>;
}
