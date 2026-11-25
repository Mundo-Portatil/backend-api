import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import {
  TechnicalServiceOrderEntity,
  ServiceOrderStatusType,
} from '../../../../domain/entities/technical-service-order.entity';
import { ServiceItemEntity } from '../../../../domain/entities/service-item.entity';
import { ServiceOrderPaymentEntity } from '../../../../domain/entities/service-order-payment.entity';
import { ServiceReceiptEntity } from '../../../../domain/entities/service-receipt.entity';
import {
  QueryServiceOrdersFilter,
  ServiceOrderRepositoryPort,
} from '../../../../domain/ports/out/service-order-repository.port';
import { ServiceOrderMapper } from './service-order.mapper';

type PrismaClientOrTx = Prisma.TransactionClient | PrismaService;

const defaultOrderInclude = {
  location: true,
  technician: true,
  items: {
    include: {
      catalog: true,
      hardwareItem: true,
      sourceLocation: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  payments: {
    orderBy: { createdAt: 'asc' as const },
  },
  receipt: true,
};

@Injectable()
export class PrismaServiceOrderRepository implements ServiceOrderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): PrismaClientOrTx {
    return (tx as Prisma.TransactionClient) || this.prisma;
  }

  async save(
    order: TechnicalServiceOrderEntity,
    tx?: unknown,
  ): Promise<TechnicalServiceOrderEntity> {
    const client = this.getClient(tx);

    const upserted = await client.technicalServiceOrder.upsert({
      where: { id: order.id || '00000000-0000-0000-0000-000000000000' },
      create: {
        code: order.code,
        locationId: order.locationId,
        technicianId: order.technicianId,
        customerName: order.customerName,
        customerDocumentType: order.customerDocumentType,
        customerDocument: order.customerDocument,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        deviceBrand: order.deviceBrand,
        deviceModel: order.deviceModel,
        deviceSerial: order.deviceSerial,
        deviceAccessories: order.deviceAccessories,
        reportedIssue: order.reportedIssue,
        technicalNotes: order.technicalNotes,
        extractedPartsNotes: order.extractedPartsNotes,
        laborCost: order.laborCost,
        partsTotal: order.partsTotal,
        totalAmount: order.totalAmount,
        status: order.status,
        cancelReason: order.cancelReason,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
      },
      update: {
        customerName: order.customerName,
        customerDocumentType: order.customerDocumentType,
        customerDocument: order.customerDocument,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        deviceBrand: order.deviceBrand,
        deviceModel: order.deviceModel,
        deviceSerial: order.deviceSerial,
        deviceAccessories: order.deviceAccessories,
        reportedIssue: order.reportedIssue,
        technicalNotes: order.technicalNotes,
        extractedPartsNotes: order.extractedPartsNotes,
        laborCost: order.laborCost,
        partsTotal: order.partsTotal,
        totalAmount: order.totalAmount,
        status: order.status,
        cancelReason: order.cancelReason,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
      },
      include: defaultOrderInclude,
    });

    return ServiceOrderMapper.toDomain(upserted);
  }

  async findById(id: string, tx?: unknown): Promise<TechnicalServiceOrderEntity | null> {
    const client = this.getClient(tx);
    const order = await client.technicalServiceOrder.findUnique({
      where: { id },
      include: defaultOrderInclude,
    });
    return order ? ServiceOrderMapper.toDomain(order) : null;
  }

  async findByCode(code: string, tx?: unknown): Promise<TechnicalServiceOrderEntity | null> {
    const client = this.getClient(tx);
    const order = await client.technicalServiceOrder.findUnique({
      where: { code },
      include: defaultOrderInclude,
    });
    return order ? ServiceOrderMapper.toDomain(order) : null;
  }

  async findAll(filter: QueryServiceOrdersFilter): Promise<{
    orders: TechnicalServiceOrderEntity[];
    total: number;
    countsByStatus: Record<ServiceOrderStatusType, number>;
  }> {
    const countsWhere: Prisma.TechnicalServiceOrderWhereInput = {};
    if (filter.locationId) {
      countsWhere.locationId = filter.locationId;
    }

    const where: Prisma.TechnicalServiceOrderWhereInput = { ...countsWhere };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.technicianId) {
      where.technicianId = filter.technicianId;
    }

    if (filter.search && filter.search.trim()) {
      const term = filter.search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerDocument: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term, mode: 'insensitive' } },
        { deviceBrand: { contains: term, mode: 'insensitive' } },
        { deviceModel: { contains: term, mode: 'insensitive' } },
        { deviceSerial: { contains: term, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const skip = (page - 1) * limit;

    const [records, total, grouped] = await Promise.all([
      this.prisma.technicalServiceOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: defaultOrderInclude,
      }),
      this.prisma.technicalServiceOrder.count({ where }),
      this.prisma.technicalServiceOrder.groupBy({
        by: ['status'],
        where: countsWhere,
        _count: { status: true },
      }),
    ]);

    const countsByStatus: Record<ServiceOrderStatusType, number> = {
      RECIBIDO: 0,
      EN_REPARACION: 0,
      LISTO: 0,
      ENTREGADO: 0,
      CANCELADO: 0,
    };

    for (const g of grouped) {
      countsByStatus[g.status as ServiceOrderStatusType] = g._count.status;
    }

    return {
      orders: records.map((r) => ServiceOrderMapper.toDomain(r)),
      total,
      countsByStatus,
    };
  }

  async addItem(item: ServiceItemEntity, tx?: unknown): Promise<ServiceItemEntity> {
    const client = this.getClient(tx);
    const created = await client.serviceItem.create({
      data: {
        serviceOrderId: item.serviceOrderId,
        catalogId: item.catalogId,
        hardwareItemId: item.hardwareItemId,
        sourceLocationId: item.sourceLocationId,
        isFromOtherPuesto: item.isFromOtherPuesto,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      },
      include: {
        catalog: true,
        hardwareItem: true,
        sourceLocation: true,
      },
    });
    return ServiceOrderMapper.itemToDomain(created);
  }

  async removeItem(itemId: string, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.serviceItem.delete({
      where: { id: itemId },
    });
  }

  async findItemById(itemId: string, tx?: unknown): Promise<ServiceItemEntity | null> {
    const client = this.getClient(tx);
    const item = await client.serviceItem.findUnique({
      where: { id: itemId },
      include: {
        catalog: true,
        hardwareItem: true,
        sourceLocation: true,
      },
    });
    return item ? ServiceOrderMapper.itemToDomain(item) : null;
  }

  async savePayment(
    payment: ServiceOrderPaymentEntity,
    tx?: unknown,
  ): Promise<ServiceOrderPaymentEntity> {
    const client = this.getClient(tx);
    const created = await client.serviceOrderPayment.create({
      data: {
        serviceOrderId: payment.serviceOrderId,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference,
      },
    });
    return ServiceOrderMapper.paymentToDomain(created);
  }

  async saveReceipt(
    receipt: ServiceReceiptEntity,
    tx?: unknown,
  ): Promise<ServiceReceiptEntity> {
    const client = this.getClient(tx);
    const upserted = await client.serviceReceipt.upsert({
      where: { serviceOrderId: receipt.serviceOrderId },
      create: {
        serviceOrderId: receipt.serviceOrderId,
        receiptType: receipt.receiptType,
        series: receipt.series,
        correlative: receipt.correlative,
        fullNumber: receipt.fullNumber,
        customerName: receipt.customerName,
        customerDocumentType: receipt.customerDocumentType,
        customerDocument: receipt.customerDocument,
        customerAddress: receipt.customerAddress,
        currency: receipt.currency,
        subtotal: receipt.subtotal,
        igvAmount: receipt.igvAmount,
        totalAmount: receipt.totalAmount,
        sunatStatus: receipt.sunatStatus,
        sunatHash: receipt.sunatHash,
        sunatCdrCode: receipt.sunatCdrCode,
        sunatXmlUrl: receipt.sunatXmlUrl,
        sunatPdfUrl: receipt.sunatPdfUrl,
      },
      update: {
        receiptType: receipt.receiptType,
        series: receipt.series,
        correlative: receipt.correlative,
        fullNumber: receipt.fullNumber,
        customerName: receipt.customerName,
        customerDocumentType: receipt.customerDocumentType,
        customerDocument: receipt.customerDocument,
        customerAddress: receipt.customerAddress,
        currency: receipt.currency,
        subtotal: receipt.subtotal,
        igvAmount: receipt.igvAmount,
        totalAmount: receipt.totalAmount,
        sunatStatus: receipt.sunatStatus,
        sunatHash: receipt.sunatHash,
        sunatCdrCode: receipt.sunatCdrCode,
        sunatXmlUrl: receipt.sunatXmlUrl,
        sunatPdfUrl: receipt.sunatPdfUrl,
      },
    });
    return ServiceOrderMapper.receiptToDomain(upserted);
  }

  async findReceiptByOrderId(
    orderId: string,
    tx?: unknown,
  ): Promise<ServiceReceiptEntity | null> {
    const client = this.getClient(tx);
    const receipt = await client.serviceReceipt.findUnique({
      where: { serviceOrderId: orderId },
    });
    return receipt ? ServiceOrderMapper.receiptToDomain(receipt) : null;
  }
}
