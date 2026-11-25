import { ServiceItemEntity } from './service-item.entity';
import { ServiceOrderPaymentEntity } from './service-order-payment.entity';
import { ServiceReceiptEntity, CustomerDocumentTypeType } from './service-receipt.entity';

export type ServiceOrderStatusType =
  | 'RECIBIDO'
  | 'EN_REPARACION'
  | 'LISTO'
  | 'ENTREGADO'
  | 'CANCELADO';

export class TechnicalServiceOrderEntity {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly locationId: string,
    public readonly technicianId: string,
    public readonly customerName: string,
    public readonly customerDocumentType: CustomerDocumentTypeType,
    public readonly customerDocument: string | null,
    public readonly customerPhone: string | null,
    public readonly customerAddress: string | null,
    public readonly deviceBrand: string,
    public readonly deviceModel: string,
    public readonly deviceSerial: string | null,
    public readonly deviceAccessories: string | null,
    public readonly reportedIssue: string,
    public readonly technicalNotes: string | null,
    public readonly extractedPartsNotes: string | null,
    public readonly laborCost: number,
    public readonly partsTotal: number,
    public readonly totalAmount: number,
    public readonly status: ServiceOrderStatusType,
    public readonly cancelReason: string | null,
    public readonly deliveredAt: Date | null,
    public readonly cancelledAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly items: ServiceItemEntity[] = [],
    public readonly payments: ServiceOrderPaymentEntity[] = [],
    public readonly receipt: ServiceReceiptEntity | null = null,
    public readonly locationName: string | null = null,
    public readonly technicianName: string | null = null,
  ) {}

  static create(props: {
    code: string;
    locationId: string;
    technicianId: string;
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
    locationName?: string | null;
    technicianName?: string | null;
  }): TechnicalServiceOrderEntity {
    const labor = props.laborCost ? Number(props.laborCost.toFixed(2)) : 0;
    const now = new Date();

    return new TechnicalServiceOrderEntity(
      '',
      props.code,
      props.locationId,
      props.technicianId,
      props.customerName.trim(),
      props.customerDocumentType ?? 'SIN_DOCUMENTO',
      props.customerDocument?.trim() ?? null,
      props.customerPhone?.trim() ?? null,
      props.customerAddress?.trim() ?? null,
      props.deviceBrand.trim(),
      props.deviceModel.trim(),
      props.deviceSerial?.trim().toUpperCase() ?? null,
      props.deviceAccessories?.trim() ?? null,
      props.reportedIssue.trim(),
      props.technicalNotes?.trim() ?? null,
      props.extractedPartsNotes?.trim() ?? null,
      labor,
      0,
      labor,
      'RECIBIDO',
      null,
      null,
      null,
      now,
      now,
      [],
      [],
      null,
      props.locationName ?? null,
      props.technicianName ?? null,
    );
  }

  updateInfo(props: {
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
  }): TechnicalServiceOrderEntity {
    if (this.status === 'ENTREGADO' || this.status === 'CANCELADO') {
      throw new Error(`No se puede modificar una orden en estado terminal (${this.status})`);
    }

    const newLaborCost = props.laborCost !== undefined ? Number(props.laborCost.toFixed(2)) : this.laborCost;
    const newTotalAmount = Number((newLaborCost + this.partsTotal).toFixed(2));

    return new TechnicalServiceOrderEntity(
      this.id,
      this.code,
      this.locationId,
      this.technicianId,
      props.customerName?.trim() ?? this.customerName,
      props.customerDocumentType ?? this.customerDocumentType,
      props.customerDocument !== undefined ? props.customerDocument?.trim() ?? null : this.customerDocument,
      props.customerPhone !== undefined ? props.customerPhone?.trim() ?? null : this.customerPhone,
      props.customerAddress !== undefined ? props.customerAddress?.trim() ?? null : this.customerAddress,
      this.deviceBrand,
      this.deviceModel,
      props.deviceSerial !== undefined ? props.deviceSerial?.trim().toUpperCase() ?? null : this.deviceSerial,
      props.deviceAccessories !== undefined ? props.deviceAccessories?.trim() ?? null : this.deviceAccessories,
      props.reportedIssue?.trim() ?? this.reportedIssue,
      props.technicalNotes !== undefined ? props.technicalNotes?.trim() ?? null : this.technicalNotes,
      props.extractedPartsNotes !== undefined ? props.extractedPartsNotes?.trim() ?? null : this.extractedPartsNotes,
      newLaborCost,
      this.partsTotal,
      newTotalAmount,
      this.status,
      this.cancelReason,
      this.deliveredAt,
      this.cancelledAt,
      this.createdAt,
      new Date(),
      this.items,
      this.payments,
      this.receipt,
      this.locationName,
      this.technicianName,
    );
  }

  changeStatus(newStatus: ServiceOrderStatusType, cancelReason?: string): TechnicalServiceOrderEntity {
    if (this.status === 'ENTREGADO' || this.status === 'CANCELADO') {
      throw new Error(`No se puede cambiar el estado de una orden terminal (${this.status})`);
    }

    if (newStatus === 'ENTREGADO') {
      throw new Error('La orden solo puede pasar a ENTREGADO a través del proceso de cobro y entrega');
    }

    if (newStatus === 'CANCELADO' && (!cancelReason || !cancelReason.trim())) {
      throw new Error('Debe proporcionar un motivo para cancelar la orden');
    }

    const allowedTransitions: Record<ServiceOrderStatusType, ServiceOrderStatusType[]> = {
      RECIBIDO: ['EN_REPARACION', 'LISTO', 'CANCELADO'],
      EN_REPARACION: ['LISTO', 'CANCELADO'],
      LISTO: ['EN_REPARACION', 'CANCELADO'],
      ENTREGADO: [],
      CANCELADO: [],
    };

    if (!allowedTransitions[this.status]?.includes(newStatus)) {
      throw new Error(`Transición no permitida de ${this.status} a ${newStatus}`);
    }

    const now = new Date();
    return new TechnicalServiceOrderEntity(
      this.id,
      this.code,
      this.locationId,
      this.technicianId,
      this.customerName,
      this.customerDocumentType,
      this.customerDocument,
      this.customerPhone,
      this.customerAddress,
      this.deviceBrand,
      this.deviceModel,
      this.deviceSerial,
      this.deviceAccessories,
      this.reportedIssue,
      this.technicalNotes,
      this.extractedPartsNotes,
      this.laborCost,
      this.partsTotal,
      this.totalAmount,
      newStatus,
      newStatus === 'CANCELADO' ? cancelReason?.trim() ?? null : this.cancelReason,
      this.deliveredAt,
      newStatus === 'CANCELADO' ? now : this.cancelledAt,
      this.createdAt,
      now,
      this.items,
      this.payments,
      this.receipt,
      this.locationName,
      this.technicianName,
    );
  }

  addItem(item: ServiceItemEntity): TechnicalServiceOrderEntity {
    if (this.status === 'ENTREGADO' || this.status === 'CANCELADO') {
      throw new Error(`No se pueden agregar repuestos a una orden en estado ${this.status}`);
    }

    const newItems = [...this.items, item];
    const newPartsTotal = Number(newItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
    const newTotalAmount = Number((this.laborCost + newPartsTotal).toFixed(2));

    return new TechnicalServiceOrderEntity(
      this.id,
      this.code,
      this.locationId,
      this.technicianId,
      this.customerName,
      this.customerDocumentType,
      this.customerDocument,
      this.customerPhone,
      this.customerAddress,
      this.deviceBrand,
      this.deviceModel,
      this.deviceSerial,
      this.deviceAccessories,
      this.reportedIssue,
      this.technicalNotes,
      this.extractedPartsNotes,
      this.laborCost,
      newPartsTotal,
      newTotalAmount,
      this.status,
      this.cancelReason,
      this.deliveredAt,
      this.cancelledAt,
      this.createdAt,
      new Date(),
      newItems,
      this.payments,
      this.receipt,
      this.locationName,
      this.technicianName,
    );
  }

  removeItem(itemId: string): TechnicalServiceOrderEntity {
    if (this.status === 'ENTREGADO' || this.status === 'CANCELADO') {
      throw new Error(`No se pueden retirar repuestos de una orden en estado ${this.status}`);
    }

    const newItems = this.items.filter((i) => i.id !== itemId);
    const newPartsTotal = Number(newItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
    const newTotalAmount = Number((this.laborCost + newPartsTotal).toFixed(2));

    return new TechnicalServiceOrderEntity(
      this.id,
      this.code,
      this.locationId,
      this.technicianId,
      this.customerName,
      this.customerDocumentType,
      this.customerDocument,
      this.customerPhone,
      this.customerAddress,
      this.deviceBrand,
      this.deviceModel,
      this.deviceSerial,
      this.deviceAccessories,
      this.reportedIssue,
      this.technicalNotes,
      this.extractedPartsNotes,
      this.laborCost,
      newPartsTotal,
      newTotalAmount,
      this.status,
      this.cancelReason,
      this.deliveredAt,
      this.cancelledAt,
      this.createdAt,
      new Date(),
      newItems,
      this.payments,
      this.receipt,
      this.locationName,
      this.technicianName,
    );
  }

  deliver(
    payments: ServiceOrderPaymentEntity[],
    receipt: ServiceReceiptEntity,
  ): TechnicalServiceOrderEntity {
    if (this.status === 'ENTREGADO' || this.status === 'CANCELADO') {
      throw new Error(`No se puede entregar una orden que ya está en estado ${this.status}`);
    }

    const sumPayments = Number(payments.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2));
    if (Math.abs(sumPayments - this.totalAmount) >= 0.01) {
      throw new Error(
        `El monto pagado (${sumPayments.toFixed(2)}) no coincide con el total de la orden (${this.totalAmount.toFixed(2)})`,
      );
    }

    const now = new Date();
    return new TechnicalServiceOrderEntity(
      this.id,
      this.code,
      this.locationId,
      this.technicianId,
      this.customerName,
      this.customerDocumentType,
      this.customerDocument,
      this.customerPhone,
      this.customerAddress,
      this.deviceBrand,
      this.deviceModel,
      this.deviceSerial,
      this.deviceAccessories,
      this.reportedIssue,
      this.technicalNotes,
      this.extractedPartsNotes,
      this.laborCost,
      this.partsTotal,
      this.totalAmount,
      'ENTREGADO',
      this.cancelReason,
      now,
      this.cancelledAt,
      this.createdAt,
      now,
      this.items,
      payments,
      receipt,
      this.locationName,
      this.technicianName,
    );
  }
}
