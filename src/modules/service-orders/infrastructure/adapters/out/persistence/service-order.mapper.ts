import {
  TechnicalServiceOrder as PrismaTechnicalServiceOrder,
  ServiceItem as PrismaServiceItem,
  ServiceOrderPayment as PrismaServiceOrderPayment,
  ServiceReceipt as PrismaServiceReceipt,
  Location as PrismaLocation,
  User as PrismaUser,
  ProductCatalog as PrismaProductCatalog,
  HardwareItem as PrismaHardwareItem,
} from '@prisma/client';
import { TechnicalServiceOrderEntity } from '../../../../domain/entities/technical-service-order.entity';
import { ServiceItemEntity } from '../../../../domain/entities/service-item.entity';
import { ServiceOrderPaymentEntity } from '../../../../domain/entities/service-order-payment.entity';
import { ServiceReceiptEntity } from '../../../../domain/entities/service-receipt.entity';

export type PrismaServiceItemWithRelations = PrismaServiceItem & {
  catalog?: PrismaProductCatalog | null;
  hardwareItem?: PrismaHardwareItem | null;
  sourceLocation?: PrismaLocation | null;
};

export type PrismaTechnicalServiceOrderWithRelations = PrismaTechnicalServiceOrder & {
  location?: PrismaLocation | null;
  technician?: PrismaUser | null;
  items?: PrismaServiceItemWithRelations[];
  payments?: PrismaServiceOrderPayment[];
  receipt?: PrismaServiceReceipt | null;
};

export class ServiceOrderMapper {
  static toDomain(raw: PrismaTechnicalServiceOrderWithRelations): TechnicalServiceOrderEntity {
    const items = (raw.items ?? []).map((item) =>
      ServiceOrderMapper.itemToDomain(item),
    );

    const payments = (raw.payments ?? []).map((payment) =>
      ServiceOrderMapper.paymentToDomain(payment),
    );

    const receipt = raw.receipt ? ServiceOrderMapper.receiptToDomain(raw.receipt) : null;

    return new TechnicalServiceOrderEntity(
      raw.id,
      raw.code,
      raw.locationId,
      raw.technicianId,
      raw.customerName,
      raw.customerDocumentType as any,
      raw.customerDocument,
      raw.customerPhone,
      raw.customerAddress,
      raw.deviceBrand,
      raw.deviceModel,
      raw.deviceSerial,
      raw.deviceAccessories,
      raw.reportedIssue,
      raw.technicalNotes,
      raw.extractedPartsNotes,
      Number(raw.laborCost),
      Number(raw.partsTotal),
      Number(raw.totalAmount),
      raw.status as any,
      raw.cancelReason,
      raw.deliveredAt,
      raw.cancelledAt,
      raw.createdAt,
      raw.updatedAt,
      items,
      payments,
      receipt,
      raw.location?.name ?? null,
      raw.technician?.name ?? null,
    );
  }

  static itemToDomain(raw: PrismaServiceItemWithRelations): ServiceItemEntity {
    return new ServiceItemEntity(
      raw.id,
      raw.serviceOrderId,
      raw.catalogId,
      raw.hardwareItemId,
      raw.sourceLocationId,
      raw.isFromOtherPuesto,
      raw.quantity,
      Number(raw.unitPrice),
      Number(raw.subtotal),
      raw.createdAt,
      raw.catalog?.sku ?? null,
      raw.catalog?.brand ?? null,
      raw.catalog?.model ?? null,
      raw.hardwareItem?.serialNumber ?? null,
      raw.sourceLocation?.name ?? null,
    );
  }

  static paymentToDomain(raw: PrismaServiceOrderPayment): ServiceOrderPaymentEntity {
    return new ServiceOrderPaymentEntity(
      raw.id,
      raw.serviceOrderId,
      raw.method as any,
      Number(raw.amount),
      raw.reference,
      raw.createdAt,
    );
  }

  static receiptToDomain(raw: PrismaServiceReceipt): ServiceReceiptEntity {
    return new ServiceReceiptEntity(
      raw.id,
      raw.serviceOrderId,
      raw.receiptType as any,
      raw.series,
      raw.correlative,
      raw.fullNumber,
      raw.customerName,
      raw.customerDocumentType as any,
      raw.customerDocument,
      raw.customerAddress,
      raw.currency,
      Number(raw.subtotal),
      Number(raw.igvAmount),
      Number(raw.totalAmount),
      raw.sunatStatus as any,
      raw.sunatHash,
      raw.sunatCdrCode,
      raw.sunatXmlUrl,
      raw.sunatPdfUrl,
      raw.issuedAt,
    );
  }
}
