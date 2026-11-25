import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderRepositoryPort } from '../../domain/ports/out/service-order-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import type {
  ServiceReceiptResponseDto,
  ServiceReceiptItemDto,
  ServiceReceiptPaymentDto,
} from '../dto/service-receipt-response.dto';

@Injectable()
export class GetServiceReceiptUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
  ) {}

  async execute(
    orderIdOrCode: string,
    userRole: string,
    userLocationId?: string | null,
  ): Promise<ServiceReceiptResponseDto> {
    const order =
      (await this.serviceOrderRepository.findById(orderIdOrCode)) ??
      (await this.serviceOrderRepository.findByCode(orderIdOrCode));

    if (!order) {
      throw new NotFoundException('Orden de servicio técnico no encontrada');
    }

    if (userRole === 'TECNICO' && userLocationId !== order.locationId) {
      throw new ForbiddenException('No tiene permisos para consultar comprobantes de otro puesto');
    }

    if (order.status !== 'ENTREGADO') {
      throw new BadRequestException('La orden no se encuentra entregada ni cuenta con comprobante de pago emitido');
    }

    const receipt = await this.serviceOrderRepository.findReceiptByOrderId(order.id);
    if (!receipt) {
      throw new NotFoundException('Comprobante de pago no encontrado para esta orden');
    }

    const location = await this.locationRepository.findById(order.locationId);

    const items: ServiceReceiptItemDto[] = [
      ...order.items.map((i) => {
        const desc = `Repuesto: ${i.catalogBrand ?? ''} ${i.catalogModel ?? ''}${
          i.serialNumber ? ` (S/N: ${i.serialNumber})` : ''
        }`.trim();
        return {
          description: desc || 'Repuesto',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        };
      }),
    ];

    if (order.laborCost > 0) {
      items.push({
        description: 'Servicio Técnico y Reparación (Mano de obra)',
        quantity: 1,
        unitPrice: order.laborCost,
        subtotal: order.laborCost,
      });
    }

    const payments: ServiceReceiptPaymentDto[] = order.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference,
    }));

    return {
      businessName: 'MUNDO PORTÁTIL',
      locationName: location?.name ?? order.locationName ?? 'Puesto de Atención',
      fullNumber: receipt.fullNumber,
      issuedAt: receipt.issuedAt,
      orderCode: order.code,
      technicianName: order.technicianName ?? 'Técnico Especialista',
      customer: {
        name: receipt.customerName,
        documentType: receipt.customerDocumentType,
        document: receipt.customerDocument,
        address: receipt.customerAddress,
        phone: order.customerPhone,
      },
      device: {
        brand: order.deviceBrand,
        model: order.deviceModel,
        serial: order.deviceSerial,
        accessories: order.deviceAccessories,
        reportedIssue: order.reportedIssue,
      },
      items,
      currency: 'PEN',
      totalAmount: receipt.totalAmount,
      payments,
    };
  }
}
