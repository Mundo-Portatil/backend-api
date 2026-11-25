import { CustomerDocumentTypeType } from '../../domain/entities/service-receipt.entity';

export interface UpdateServiceOrderCommandDto {
  customerName?: string;
  customerDocumentType?: CustomerDocumentTypeType;
  customerDocument?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  deviceSerial?: string | null;
  deviceAccessories?: string | null;
  reportedIssue?: string;
  technicalNotes?: string | null;
  extractedPartsNotes?: string | null;
  laborCost?: number;
}
