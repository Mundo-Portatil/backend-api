import { CustomerDocumentTypeType } from '../../domain/entities/service-receipt.entity';

export interface CreateServiceOrderCommandDto {
  locationId?: string;
  customerName: string;
  customerDocumentType?: CustomerDocumentTypeType;
  customerDocument?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial?: string | null;
  deviceAccessories?: string | null;
  reportedIssue: string;
  technicalNotes?: string | null;
  extractedPartsNotes?: string | null;
  laborCost?: number;
  userId: string;
  userRole: string;
  userLocationId?: string | null;
  userName?: string | null;
}
