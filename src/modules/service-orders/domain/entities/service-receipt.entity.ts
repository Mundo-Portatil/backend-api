export type ReceiptTypeType = 'BOLETA_INTERNA' | 'BOLETA' | 'FACTURA';
export type SunatStatusType = 'NO_APLICA' | 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
export type CustomerDocumentTypeType = 'SIN_DOCUMENTO' | 'DNI' | 'RUC' | 'CE';

export class ServiceReceiptEntity {
  constructor(
    public readonly id: string,
    public readonly serviceOrderId: string,
    public readonly receiptType: ReceiptTypeType,
    public readonly series: string,
    public readonly correlative: string,
    public readonly fullNumber: string,
    public readonly customerName: string,
    public readonly customerDocumentType: CustomerDocumentTypeType,
    public readonly customerDocument: string | null,
    public readonly customerAddress: string | null,
    public readonly currency: string,
    public readonly subtotal: number,
    public readonly igvAmount: number,
    public readonly totalAmount: number,
    public readonly sunatStatus: SunatStatusType,
    public readonly sunatHash: string | null,
    public readonly sunatCdrCode: string | null,
    public readonly sunatXmlUrl: string | null,
    public readonly sunatPdfUrl: string | null,
    public readonly issuedAt: Date,
  ) {}

  static create(props: {
    serviceOrderId: string;
    receiptType: ReceiptTypeType;
    series: string;
    correlative: string;
    fullNumber: string;
    customerName: string;
    customerDocumentType: CustomerDocumentTypeType;
    customerDocument?: string | null;
    customerAddress?: string | null;
    currency?: string;
    totalAmount: number;
    sunatStatus?: SunatStatusType;
    sunatHash?: string | null;
    sunatCdrCode?: string | null;
    sunatXmlUrl?: string | null;
    sunatPdfUrl?: string | null;
  }): ServiceReceiptEntity {
    const total = Number(props.totalAmount.toFixed(2));
    const subtotal = Number((total / 1.18).toFixed(2));
    const igv = Number((total - subtotal).toFixed(2));

    return new ServiceReceiptEntity(
      '',
      props.serviceOrderId,
      props.receiptType,
      props.series,
      props.correlative,
      props.fullNumber,
      props.customerName.trim(),
      props.customerDocumentType,
      props.customerDocument ?? null,
      props.customerAddress ?? null,
      props.currency ?? 'PEN',
      subtotal,
      igv,
      total,
      props.sunatStatus ?? 'NO_APLICA',
      props.sunatHash ?? null,
      props.sunatCdrCode ?? null,
      props.sunatXmlUrl ?? null,
      props.sunatPdfUrl ?? null,
      new Date(),
    );
  }
}
