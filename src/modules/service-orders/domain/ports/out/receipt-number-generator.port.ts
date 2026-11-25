import { ReceiptTypeType } from '../../entities/service-receipt.entity';

export const RECEIPT_NUMBER_GENERATOR = Symbol('RECEIPT_NUMBER_GENERATOR');

export interface ReceiptNumberGeneratorPort {
  generateReceiptNumber(
    type: ReceiptTypeType,
    locationId: string,
    tx?: unknown,
  ): Promise<{ series: string; correlative: string; fullNumber: string }>;
}
