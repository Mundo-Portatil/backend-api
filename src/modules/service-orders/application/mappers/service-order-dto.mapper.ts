import { TechnicalServiceOrderEntity } from '../../domain/entities/technical-service-order.entity';
import { ServiceOrderResponseDto } from '../dto/service-order-response.dto';
import {
  ServiceOrderDetailResponseDto,
  ServiceItemDetailDto,
  ServiceOrderPaymentDetailDto,
  ServiceReceiptDetailDto,
} from '../dto/service-order-detail-response.dto';

export class ServiceOrderDtoMapper {
  static toResponseDto(entity: TechnicalServiceOrderEntity): ServiceOrderResponseDto {
    return {
      id: entity.id,
      code: entity.code,
      locationId: entity.locationId,
      locationName: entity.locationName,
      technicianId: entity.technicianId,
      technicianName: entity.technicianName,
      customerName: entity.customerName,
      customerDocumentType: entity.customerDocumentType,
      customerDocument: entity.customerDocument,
      customerPhone: entity.customerPhone,
      customerAddress: entity.customerAddress,
      deviceBrand: entity.deviceBrand,
      deviceModel: entity.deviceModel,
      deviceSerial: entity.deviceSerial,
      deviceAccessories: entity.deviceAccessories,
      reportedIssue: entity.reportedIssue,
      technicalNotes: entity.technicalNotes,
      extractedPartsNotes: entity.extractedPartsNotes,
      laborCost: entity.laborCost,
      partsTotal: entity.partsTotal,
      totalAmount: entity.totalAmount,
      status: entity.status,
      cancelReason: entity.cancelReason,
      deliveredAt: entity.deliveredAt,
      cancelledAt: entity.cancelledAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      itemsCount: entity.items?.length ?? 0,
    };
  }

  static toDetailResponseDto(entity: TechnicalServiceOrderEntity): ServiceOrderDetailResponseDto {
    const base = this.toResponseDto(entity);

    const items: ServiceItemDetailDto[] = (entity.items ?? []).map((i) => ({
      id: i.id,
      catalogId: i.catalogId,
      hardwareItemId: i.hardwareItemId,
      sourceLocationId: i.sourceLocationId,
      sourceLocationName: i.sourceLocationName,
      isFromOtherPuesto: i.isFromOtherPuesto,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
      createdAt: i.createdAt,
      catalogSku: i.catalogSku,
      catalogBrand: i.catalogBrand,
      catalogModel: i.catalogModel,
      serialNumber: i.serialNumber,
    }));

    const payments: ServiceOrderPaymentDetailDto[] = (entity.payments ?? []).map((p) => ({
      id: p.id,
      method: p.method,
      amount: p.amount,
      reference: p.reference,
      createdAt: p.createdAt,
    }));

    const receipt: ServiceReceiptDetailDto | null = entity.receipt
      ? {
          id: entity.receipt.id,
          receiptType: entity.receipt.receiptType,
          series: entity.receipt.series,
          correlative: entity.receipt.correlative,
          fullNumber: entity.receipt.fullNumber,
          customerName: entity.receipt.customerName,
          customerDocumentType: entity.receipt.customerDocumentType,
          customerDocument: entity.receipt.customerDocument,
          customerAddress: entity.receipt.customerAddress,
          currency: entity.receipt.currency,
          totalAmount: entity.receipt.totalAmount,
          issuedAt: entity.receipt.issuedAt,
        }
      : null;

    return {
      ...base,
      items,
      payments,
      receipt,
    };
  }
}
