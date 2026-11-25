import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderRepositoryPort } from '../../domain/ports/out/service-order-repository.port';
import { RECEIPT_NUMBER_GENERATOR } from '../../domain/ports/out/receipt-number-generator.port';
import type { ReceiptNumberGeneratorPort } from '../../domain/ports/out/receipt-number-generator.port';
import { ELECTRONIC_BILLING_PORT } from '../../domain/ports/out/electronic-billing.port';
import type { ElectronicBillingPort } from '../../domain/ports/out/electronic-billing.port';
import { TRANSACTION_MANAGER_PORT } from '../../../../shared/domain/ports/transaction-manager.port';
import type { TransactionManagerPort } from '../../../../shared/domain/ports/transaction-manager.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { ServiceReceiptEntity } from '../../domain/entities/service-receipt.entity';
import { ServiceOrderPaymentEntity } from '../../domain/entities/service-order-payment.entity';
import type { DeliverServiceOrderCommandDto } from '../dto/deliver-service-order-command.dto';
import type { ServiceOrderDetailResponseDto } from '../dto/service-order-detail-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class DeliverServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
    @Inject(RECEIPT_NUMBER_GENERATOR)
    private readonly receiptNumberGenerator: ReceiptNumberGeneratorPort,
    @Inject(ELECTRONIC_BILLING_PORT)
    private readonly electronicBilling: ElectronicBillingPort,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    orderIdOrCode: string,
    dto: DeliverServiceOrderCommandDto,
    ipAddress?: string,
  ): Promise<ServiceOrderDetailResponseDto> {
    const order =
      (await this.serviceOrderRepository.findById(orderIdOrCode)) ??
      (await this.serviceOrderRepository.findByCode(orderIdOrCode));

    if (!order) {
      throw new NotFoundException('Orden de servicio técnico no encontrada');
    }

    if (dto.userRole === 'TECNICO' && dto.userLocationId !== order.locationId) {
      throw new ForbiddenException('No tiene permisos para modificar órdenes de otro puesto');
    }

    if (order.status === 'ENTREGADO' || order.status === 'CANCELADO') {
      throw new BadRequestException(`No se puede entregar una orden en estado ${order.status}`);
    }

    if (!dto.payments || dto.payments.length === 0) {
      throw new BadRequestException('Debe registrar al menos un medio de pago');
    }

    for (const p of dto.payments) {
      if (p.amount <= 0) {
        throw new BadRequestException('El monto de cada pago debe ser mayor a 0');
      }
    }

    const totalPaid = Number(dto.payments.reduce((acc, p) => acc + p.amount, 0).toFixed(2));
    if (Math.abs(totalPaid - order.totalAmount) >= 0.01) {
      throw new BadRequestException(
        `El total pagado (${totalPaid.toFixed(2)}) no coincide con el total de la orden (${order.totalAmount.toFixed(2)})`,
      );
    }

    const savedOrder = await this.transactionManager.runInTransaction(async (tx) => {
      const receiptType = dto.receipt?.receiptType ?? 'BOLETA_INTERNA';
      const { series, correlative, fullNumber } = await this.receiptNumberGenerator.generateReceiptNumber(
        receiptType,
        order.locationId,
        tx,
      );

      const receiptEntity = ServiceReceiptEntity.create({
        serviceOrderId: order.id,
        receiptType,
        series,
        correlative,
        fullNumber,
        customerName: dto.receipt?.customerName?.trim() || order.customerName,
        customerDocumentType: dto.receipt?.customerDocumentType || order.customerDocumentType,
        customerDocument:
          dto.receipt?.customerDocument !== undefined ? dto.receipt.customerDocument : order.customerDocument,
        customerAddress:
          dto.receipt?.customerAddress !== undefined ? dto.receipt.customerAddress : order.customerAddress,
        currency: 'PEN',
        totalAmount: order.totalAmount,
      });

      const savedReceipt = await this.serviceOrderRepository.saveReceipt(receiptEntity, tx);

      const savedPayments: ServiceOrderPaymentEntity[] = [];
      for (const p of dto.payments) {
        const pEntity = ServiceOrderPaymentEntity.create({
          serviceOrderId: order.id,
          method: p.method,
          amount: p.amount,
          reference: p.reference,
        });
        const savedP = await this.serviceOrderRepository.savePayment(pEntity, tx);
        savedPayments.push(savedP);
      }

      const deliveredOrder = order.deliver(savedPayments, savedReceipt);
      const resultOrder = await this.serviceOrderRepository.save(deliveredOrder, tx);

      const billingItems = [
        ...order.items.map((it) => ({
          description: `Repuesto: ${it.catalogBrand ?? ''} ${it.catalogModel ?? ''}`.trim() || 'Repuesto',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal,
        })),
      ];

      if (order.laborCost > 0) {
        billingItems.push({
          description: 'Servicio Técnico / Mano de Obra',
          quantity: 1,
          unitPrice: order.laborCost,
          subtotal: order.laborCost,
        });
      }

      await this.electronicBilling.issueReceipt(
        {
          receiptType,
          series,
          correlative,
          fullNumber,
          customerName: savedReceipt.customerName,
          customerDocumentType: savedReceipt.customerDocumentType,
          customerDocument: savedReceipt.customerDocument,
          customerAddress: savedReceipt.customerAddress,
          currency: 'PEN',
          subtotal: savedReceipt.subtotal,
          igvAmount: savedReceipt.igvAmount,
          totalAmount: savedReceipt.totalAmount,
          items: billingItems,
        },
        tx,
      );

      await this.auditLogPort.record({
        userId: dto.userId,
        action: 'SERVICE_ORDER_DELIVERED',
        module: 'SERVICE_ORDERS',
        payload: {
          orderId: order.id,
          orderCode: order.code,
          receiptNumber: fullNumber,
          receiptType,
          totalAmount: order.totalAmount,
          payments: dto.payments,
        },
        ipAddress,
      });

      return resultOrder;
    });

    return ServiceOrderDtoMapper.toDetailResponseDto(savedOrder);
  }
}
