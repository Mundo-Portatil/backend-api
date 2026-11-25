import { Injectable, Logger } from '@nestjs/common';
import type {
  ElectronicBillingPort,
  IssueReceiptData,
  ElectronicBillingResult,
} from '../../../../domain/ports/out/electronic-billing.port';

@Injectable()
export class InternalReceiptBillingAdapter implements ElectronicBillingPort {
  private readonly logger = new Logger(InternalReceiptBillingAdapter.name);

  async issueReceipt(data: IssueReceiptData, tx?: unknown): Promise<ElectronicBillingResult> {
    this.logger.log(
      `Emitiendo comprobante ${data.receiptType} [${data.fullNumber}] por total ${data.totalAmount} PEN para cliente "${data.customerName}"`,
    );

    if (data.receiptType === 'BOLETA_INTERNA') {
      return {
        sunatStatus: 'NO_APLICA',
        sunatHash: null,
        sunatCdrCode: null,
        sunatXmlUrl: null,
        sunatPdfUrl: null,
      };
    }

    // Para comprobantes oficiales (BOLETA, FACTURA), queda en estado PENDIENTE de envío a OSE/SUNAT
    return {
      sunatStatus: 'PENDIENTE',
      sunatHash: null,
      sunatCdrCode: null,
      sunatXmlUrl: null,
      sunatPdfUrl: null,
    };
  }
}
