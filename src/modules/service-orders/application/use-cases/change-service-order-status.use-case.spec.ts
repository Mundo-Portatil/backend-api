import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { ChangeServiceOrderStatusUseCase } from './change-service-order-status.use-case';
import { TechnicalServiceOrderEntity } from '../../domain/entities/technical-service-order.entity';
import { ServiceItemEntity } from '../../domain/entities/service-item.entity';
import { HardwareItemEntity } from '../../../hardware-items/domain/entities/hardware-item.entity';

describe('ChangeServiceOrderStatusUseCase', () => {
  let useCase: ChangeServiceOrderStatusUseCase;
  let mockServiceOrderRepository: any;
  let mockHardwareItemRepository: any;
  let mockQuantityStockRepository: any;
  let mockTransactionManager: any;
  let mockAuditLogPort: any;

  const mockActiveOrder = new TechnicalServiceOrderEntity(
    'order-1',
    'OS-123456',
    'puesto-1',
    'tech-1',
    'Cliente Test',
    'DNI',
    null,
    null,
    null,
    'HP',
    'Victus',
    null,
    null,
    'Falla',
    null,
    null,
    50,
    150,
    200,
    'EN_REPARACION',
    null,
    null,
    null,
    new Date(),
    new Date(),
    [
      new ServiceItemEntity(
        'item-hw-1',
        'order-1',
        'cat-ssd',
        'hw-ssd-1',
        'puesto-1',
        false,
        1,
        100,
        100,
        new Date(),
        'SKU-SSD',
        'Kingston',
        'A400',
        'SN-SSD-999',
      ),
      new ServiceItemEntity(
        'item-qty-1',
        'order-1',
        'cat-pasta',
        null,
        'puesto-1',
        false,
        2,
        25,
        50,
        new Date(),
        'SKU-PASTA',
        'Arctic',
        'MX-4',
      ),
    ],
  );

  beforeEach(() => {
    mockServiceOrderRepository = {
      findById: jest.fn().mockResolvedValue(mockActiveOrder),
      findByCode: jest.fn().mockResolvedValue(mockActiveOrder),
      save: jest.fn().mockImplementation(async (order: any) => order),
    };

    mockHardwareItemRepository = {
      findById: jest.fn().mockResolvedValue(
        new HardwareItemEntity(
          'hw-ssd-1',
          'SN-SSD-999',
          'cat-ssd',
          'puesto-1',
          'VENDIDO',
          null,
          80,
          100,
          new Date(),
          new Date(),
        ),
      ),
      save: jest.fn().mockImplementation(async (hw: any) => hw),
    };

    mockQuantityStockRepository = {
      upsert: jest.fn().mockResolvedValue({}),
    };

    mockTransactionManager = {
      runInTransaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new ChangeServiceOrderStatusUseCase(
      mockServiceOrderRepository,
      mockHardwareItemRepository,
      mockQuantityStockRepository,
      mockTransactionManager,
      mockAuditLogPort,
    );
  });

  it('debe arrojar 400 si se intenta cambiar directamente el estado a ENTREGADO', async () => {
    await expect(
      useCase.execute('order-1', {
        status: 'ENTREGADO',
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: 'puesto-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar 400 si se cancela la orden sin especificar cancelReason', async () => {
    await expect(
      useCase.execute('order-1', {
        status: 'CANCELADO',
        cancelReason: '',
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: 'puesto-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe revertir atómicamente inventario serializado y cuantitativo al cancelar una orden', async () => {
    const result = await useCase.execute('order-1', {
      status: 'CANCELADO',
      cancelReason: 'Cliente no aprobó presupuesto de reparación',
      userId: 'tech-1',
      userRole: 'TECNICO',
      userLocationId: 'puesto-1',
    });

    expect(result.status).toBe('CANCELADO');
    expect(result.cancelReason).toBe('Cliente no aprobó presupuesto de reparación');

    // Verificación de reversión de hardware serializado a EN_STOCK
    expect(mockHardwareItemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'EN_STOCK' }),
      expect.anything(),
    );
    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      'cat-ssd',
      'puesto-1',
      1,
      undefined,
      undefined,
      expect.anything(),
    );

    // Verificación de reversión de repuesto cuantitativo
    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      'cat-pasta',
      'puesto-1',
      2,
      undefined,
      undefined,
      expect.anything(),
    );

    // Verificación de registro de auditoría con motivo
    expect(mockAuditLogPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SERVICE_ORDER_CANCELLED',
      }),
    );
  });
});
