import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { GetServiceReceiptUseCase } from './get-service-receipt.use-case';
import { TechnicalServiceOrderEntity } from '../../domain/entities/technical-service-order.entity';
import { ServiceReceiptEntity } from '../../domain/entities/service-receipt.entity';
import { ServiceItemEntity } from '../../domain/entities/service-item.entity';
import { ServiceOrderPaymentEntity } from '../../domain/entities/service-order-payment.entity';
import { LocationEntity } from '../../../locations/domain/entities/location.entity';
import { LocationType } from '@prisma/client';

describe('GetServiceReceiptUseCase', () => {
  let useCase: GetServiceReceiptUseCase;
  let mockServiceOrderRepository: any;
  let mockLocationRepository: any;

  const mockReceipt = new ServiceReceiptEntity(
    'rcpt-1',
    'order-1',
    'BOLETA_INTERNA',
    'BS01',
    '000105',
    'BS01-000105',
    'Carlos Mendoza',
    'DNI',
    '44556677',
    'Av. Central 456',
    'PEN',
    169.49, // subtotal interno con IGV desglosado
    30.51,  // igvAmount interno
    200.0,  // totalAmount
    'NO_APLICA',
    null,
    null,
    null,
    null,
    new Date(),
  );

  const mockDeliveredOrder = new TechnicalServiceOrderEntity(
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
    200,
    'ENTREGADO',
    null,
    new Date(),
    null,
    new Date(),
    new Date(),
    [
      new ServiceItemEntity(
        'item-1',
        'order-1',
        'cat-1',
        null,
        'loc-1',
        false,
        1,
        120,
        120,
        new Date(),
        'SKU-SSD',
        'Kingston',
        'KC600 512GB',
      ),
    ],
    [
      new ServiceOrderPaymentEntity('pay-1', 'order-1', 'EFECTIVO', 200, null, new Date()),
    ],
    mockReceipt,
    'Puesto Central',
    'Juan Técnico',
  );

  beforeEach(() => {
    mockServiceOrderRepository = {
      findById: jest.fn().mockResolvedValue(mockDeliveredOrder),
      findByCode: jest.fn().mockResolvedValue(mockDeliveredOrder),
      findReceiptByOrderId: jest.fn().mockResolvedValue(mockReceipt),
    };

    mockLocationRepository = {
      findById: jest.fn().mockResolvedValue(
        new LocationEntity('loc-1', 'Puesto Central', LocationType.PUESTO, true, new Date()),
      ),
    };

    useCase = new GetServiceReceiptUseCase(
      mockServiceOrderRepository,
      mockLocationRepository,
    );
  });

  it('debe arrojar 400 Bad Request si la orden aún no está en estado ENTREGADO', async () => {
    const activeOrder = new TechnicalServiceOrderEntity(
      'order-active',
      'OS-112233',
      'loc-1',
      'tech-1',
      'Cliente',
      'DNI',
      null,
      null,
      null,
      'Dell',
      'Vostro',
      null,
      null,
      'Falla',
      null,
      null,
      50,
      0,
      50,
      'LISTO',
      null,
      null,
      null,
      new Date(),
      new Date(),
    );
    mockServiceOrderRepository.findById.mockResolvedValue(activeOrder);

    await expect(
      useCase.execute('order-active', 'TECNICO', 'loc-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe retornar formato de boleta limpia SIN subtotal, SIN igvAmount y SIN campos SUNAT', async () => {
    const result = await useCase.execute('order-1', 'TECNICO', 'loc-1');

    // Verificaciones de contenido esperado
    expect(result.businessName).toBe('MUNDO PORTÁTIL');
    expect(result.locationName).toBe('Puesto Central');
    expect(result.fullNumber).toBe('BS01-000105');
    expect(result.orderCode).toBe('OS-998877');
    expect(result.technicianName).toBe('Juan Técnico');
    expect(result.customer.name).toBe('Carlos Mendoza');
    expect(result.customer.document).toBe('44556677');
    expect(result.device.brand).toBe('Dell');
    expect(result.totalAmount).toBe(200.0);
    expect(result.items).toHaveLength(2); // Repuesto + Mano de obra
    expect(result.payments).toHaveLength(1);

    // Verificación estricta: NO debe exponer subtotal, igvAmount ni campos SUNAT
    const rawResult = result as any;
    expect(rawResult.subtotal).toBeUndefined();
    expect(rawResult.igvAmount).toBeUndefined();
    expect(rawResult.sunatStatus).toBeUndefined();
    expect(rawResult.sunatHash).toBeUndefined();
    expect(rawResult.sunatCdrCode).toBeUndefined();
    expect(rawResult.sunatXmlUrl).toBeUndefined();
    expect(rawResult.sunatPdfUrl).toBeUndefined();
  });
});
