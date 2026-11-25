import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AddServiceItemUseCase } from './add-service-item.use-case';
import { TechnicalServiceOrderEntity } from '../../domain/entities/technical-service-order.entity';
import { HardwareItemEntity } from '../../../hardware-items/domain/entities/hardware-item.entity';
import { QuantityStockEntity } from '../../../quantity-stock/domain/entities/quantity-stock.entity';
import { LocationEntity } from '../../../locations/domain/entities/location.entity';
import { CatalogItemEntity } from '../../../catalog/domain/entities/catalog-item.entity';
import { LocationType } from '@prisma/client';

describe('AddServiceItemUseCase', () => {
  let useCase: AddServiceItemUseCase;
  let mockServiceOrderRepository: any;
  let mockHardwareItemRepository: any;
  let mockQuantityStockRepository: any;
  let mockLocationRepository: any;
  let mockCatalogRepository: any;
  let mockTransactionManager: any;
  let mockAuditLogPort: any;

  const mockActiveOrder = new TechnicalServiceOrderEntity(
    'order-1',
    'OS-100200',
    'puesto-1',
    'tech-1',
    'Cliente Test',
    'DNI',
    '72345678',
    '987654321',
    null,
    'Lenovo',
    'ThinkPad T480',
    'PF001',
    null,
    'Problema test',
    null,
    null,
    60,
    0,
    60,
    'RECIBIDO',
    null,
    null,
    null,
    new Date(),
    new Date(),
    [],
    [],
    null,
    'Puesto 1',
    'Técnico 1',
  );

  beforeEach(() => {
    mockServiceOrderRepository = {
      findById: jest.fn().mockResolvedValue(mockActiveOrder),
      findByCode: jest.fn().mockResolvedValue(mockActiveOrder),
      addItem: jest.fn().mockImplementation(async (item: any) => ({
        ...item,
        id: 'item-1',
      })),
      save: jest.fn().mockImplementation(async (order: any) => order),
    };

    mockHardwareItemRepository = {
      findById: jest.fn(),
      save: jest.fn().mockImplementation(async (hw: any) => hw),
    };

    mockQuantityStockRepository = {
      findByCatalogAndLocation: jest.fn(),
      upsert: jest.fn().mockImplementation(async (catId: string, locId: string, inc: number) => ({
        id: 'stock-1',
        catalogId: catId,
        locationId: locId,
        quantity: 10 + inc,
      })),
    };

    mockLocationRepository = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        return new LocationEntity(id, `Puesto ${id}`, LocationType.PUESTO, true, new Date());
      }),
    };

    mockCatalogRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'cat-1',
        sku: 'SKU-SSD-512',
        brand: 'Kingston',
        model: 'KC600 512GB',
        categoryId: 'categ-1',
        active: true,
      }),
    };

    mockTransactionManager = {
      runInTransaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new AddServiceItemUseCase(
      mockServiceOrderRepository,
      mockHardwareItemRepository,
      mockQuantityStockRepository,
      mockLocationRepository,
      mockCatalogRepository,
      mockTransactionManager,
      mockAuditLogPort,
    );
  });

  it('debe consumir exitosamente repuesto serializado en el propio puesto', async () => {
    const hwItem = new HardwareItemEntity(
      'hw-1',
      'SN-SSD-001',
      'cat-1',
      'puesto-1',
      'EN_STOCK',
      null,
      120,
      160,
      new Date(),
      new Date(),
    );
    mockHardwareItemRepository.findById.mockResolvedValue(hwItem);
    mockQuantityStockRepository.findByCatalogAndLocation.mockResolvedValue(
      new QuantityStockEntity('qs-1', 'cat-1', 'puesto-1', 5, 120, 160, new Date()),
    );

    const result = await useCase.execute('order-1', {
      catalogId: 'cat-1',
      hardwareItemId: 'hw-1',
      unitPrice: 150,
      userId: 'tech-1',
      userRole: 'TECNICO',
      userLocationId: 'puesto-1',
    });

    expect(result.partsTotal).toBe(150);
    expect(result.totalAmount).toBe(210); // 60 labor + 150 part
    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      'cat-1',
      'puesto-1',
      -1,
      undefined,
      undefined,
      expect.anything(),
    );
    expect(mockHardwareItemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'VENDIDO' }),
      expect.anything(),
    );
  });

  it('debe consumir exitosamente repuesto cuantitativo desde otro puesto marcando isFromOtherPuesto = true', async () => {
    mockQuantityStockRepository.findByCatalogAndLocation.mockResolvedValue(
      new QuantityStockEntity('qs-2', 'cat-1', 'puesto-2', 10, 50, 70, new Date()),
    );

    const result = await useCase.execute('order-1', {
      catalogId: 'cat-1',
      sourceLocationId: 'puesto-2',
      quantity: 2,
      unitPrice: 65,
      userId: 'tech-1',
      userRole: 'TECNICO',
      userLocationId: 'puesto-1',
    });

    expect(result.partsTotal).toBe(130); // 2 * 65
    expect(result.totalAmount).toBe(190); // 60 + 130
    expect(result.items[0].isFromOtherPuesto).toBe(true);
    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      'cat-1',
      'puesto-2',
      -2,
      undefined,
      undefined,
      expect.anything(),
    );
  });

  it('debe arrojar 400 Bad Request si el stock cuantitativo es insuficiente', async () => {
    mockQuantityStockRepository.findByCatalogAndLocation.mockResolvedValue(
      new QuantityStockEntity('qs-1', 'cat-1', 'puesto-1', 1, 50, 70, new Date()),
    );

    await expect(
      useCase.execute('order-1', {
        catalogId: 'cat-1',
        quantity: 5,
        unitPrice: 50,
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: 'puesto-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar 400 Bad Request si el ítem serializado no está EN_STOCK', async () => {
    const hwItem = new HardwareItemEntity(
      'hw-1',
      'SN-SSD-001',
      'cat-1',
      'puesto-1',
      'VENDIDO',
      null,
      120,
      160,
      new Date(),
      new Date(),
    );
    mockHardwareItemRepository.findById.mockResolvedValue(hwItem);

    await expect(
      useCase.execute('order-1', {
        catalogId: 'cat-1',
        hardwareItemId: 'hw-1',
        unitPrice: 150,
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: 'puesto-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar 400 Bad Request si la orden está en estado terminal (ENTREGADO o CANCELADO)', async () => {
    const terminalOrder = new TechnicalServiceOrderEntity(
      'order-delivered',
      'OS-100200',
      'puesto-1',
      'tech-1',
      'Cliente Test',
      'DNI',
      null,
      null,
      null,
      'Lenovo',
      'ThinkPad',
      null,
      null,
      'Falla',
      null,
      null,
      50,
      0,
      50,
      'ENTREGADO',
      null,
      new Date(),
      null,
      new Date(),
      new Date(),
    );
    mockServiceOrderRepository.findById.mockResolvedValue(terminalOrder);

    await expect(
      useCase.execute('order-delivered', {
        catalogId: 'cat-1',
        quantity: 1,
        unitPrice: 50,
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: 'puesto-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
