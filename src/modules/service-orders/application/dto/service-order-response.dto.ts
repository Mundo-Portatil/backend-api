import { ServiceOrderStatusType } from '../../domain/entities/technical-service-order.entity';
import { CustomerDocumentTypeType } from '../../domain/entities/service-receipt.entity';

export interface ServiceOrderResponseDto {
  id: string;
  code: string;
  locationId: string;
  locationName: string | null;
  technicianId: string;
  technicianName: string | null;
  customerName: string;
  customerDocumentType: CustomerDocumentTypeType;
  customerDocument: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial: string | null;
  deviceAccessories: string | null;
  reportedIssue: string;
  technicalNotes: string | null;
  extractedPartsNotes: string | null;
  laborCost: number;
  partsTotal: number;
  totalAmount: number;
  status: ServiceOrderStatusType;
  cancelReason: string | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  itemsCount: number;
}
