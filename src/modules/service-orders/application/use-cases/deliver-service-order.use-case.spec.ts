import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { DeliverServiceOrderUseCase } from './deliver-service-order.use-case';
import { TechnicalServiceOrderEntity } from '../../domain/entities/technical-service-order.entity';
import { ServiceReceiptEntity } from '../../domain/entities/service-receipt.entity';
import { ServiceOrderPaymentEntity } from '../../domain/entities/service-order-payment.entity';

describe('DeliverServiceOrderUseCase', () => {
  let useCase: DeliverServiceOrderUseCase;
  let mockServiceOrderRepository: any;
  let mockReceiptNumberGenerator: any;
  let mockElectronicBilling: any;
  let mockTransactionManager: any;
  let mockAuditLogPort: any;

  const mockOrder = new TechnicalServiceOrderEntity(
    'order-1',
    'OS-998877',
    'loc-1',
    'tech-1',
    'Carlos Mendoza',
    'DNI',
    '44556677',
    '998877665',
    'Av. Central 456',
    'Dell',
    'Inspiron 15',
    'DL12345',
    null,
    'Mantenimiento general',
    null,
    null,
    80,
    120,
    200, // totalAmount = 200
    'LISTO',
    null,
    null,
    null,
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mockServiceOrderRepository = {
      findById: jest.fn().mockResolvedValue(mockOrder),
      findByCode: jest.fn().mockResolvedValue(mockOrder),
      saveReceipt: jest.fn().mockImplementation(async (r: any) => ({ ...r, id: 'rcpt-1' })),
      savePayment: jest.fn().mockImplementation(async (p: any) => ({ ...p, id: 'pay-1' })),
      save: jest.fn().mockImplementation(async (o: any) => o),
    };

    mockReceiptNumberGenerator = {
      generateReceiptNumber: jest.fn().mockResolvedValue({
        series: 'BS01',
        correlative: '000105',
        fullNumber: 'BS01-000105',
      }),
    };

    mockElectronicBilling = {
      issueReceipt: jest.fn().mockResolvedValue({
        sunatStatus: 'NO_APLICA',
      }),
    };

    mockTransactionManager = {
      runInTransaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new DeliverServiceOrderUseCase(
      mockServiceOrderRepository,
      mockReceiptNumberGenerator,
      mockElectronicBilling,
      mockTransactionManager,
      mockAuditLogPort,
    );
  });

  it('debe rechazar con 400 si la suma de pagos combinados no cuadra exactamente con el totalAmount', async () => {
    await expect(
      useCase.execute('order-1', {
        payments: [
          { method: 'EFECTIVO', amount: 100 },
          { method: 'YAPE', amount: 50 }, // Total: 150 vs 200
        ],
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: 'loc-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe registrar pagos combinados, generar boleta y transicionar orden a ENTREGADO cuando los pagos cuadran', async () => {
    const result = await useCase.execute('order-1', {
      payments: [
        { method: 'EFECTIVO', amount: 100 },
        { method: 'YAPE', amount: 100, reference: 'Operación 987654' },
      ],
      receipt: {
        receiptType: 'BOLETA_INTERNA',
        customerName: 'Carlos Mendoza',
      },
      userId: 'tech-1',
      userRole: 'TECNICO',
      userLocationId: 'loc-1',
    });

    expect(result.status).toBe('ENTREGADO');
    expect(result.receipt).toBeDefined();
    expect(result.receipt?.fullNumber).toBe('BS01-000105');
    expect(result.payments).toHaveLength(2);
    expect(mockElectronicBilling.issueReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        fullNumber: 'BS01-000105',
        totalAmount: 200,
      }),
      expect.anything(),
    );
    expect(mockAuditLogPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SERVICE_ORDER_DELIVERED',
        userId: 'tech-1',
      }),
    );
  });
});
