import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateDirectTransferUseCase } from './create-direct-transfer.use-case';
import { LocationEntity } from '../../../locations/domain/entities/location.entity';
import { HardwareItemEntity } from '../../../hardware-items/domain/entities/hardware-item.entity';
import { QuantityStockEntity } from '../../../quantity-stock/domain/entities/quantity-stock.entity';
import { LocationType, Role } from '@prisma/client';

describe('CreateDirectTransferUseCase', () => {
  let useCase: CreateDirectTransferUseCase;
  let mockTransferRepository: any;
  let mockCodeGenerator: any;
  let mockHardwareItemRepository: any;
  let mockQuantityStockRepository: any;
  let mockLocationRepository: any;
  let mockTransactionManager: any;
  let mockAuditLogPort: any;

  beforeEach(() => {
    mockTransferRepository = {
      create: jest.fn().mockImplementation(async (t: any) => ({
        ...t,
        id: 'transfer-1',
      })),
    };

    mockCodeGenerator = {
      generateCode: jest.fn().mockResolvedValue('TR-100200'),
    };

    mockHardwareItemRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockQuantityStockRepository = {
      findByCatalogAndLocation: jest.fn(),
      upsert: jest.fn(),
    };

    mockLocationRepository = {
      findById: jest.fn(),
    };

    mockTransactionManager = {
      runInTransaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new CreateDirectTransferUseCase(
      mockTransferRepository,
      mockCodeGenerator,
      mockHardwareItemRepository,
      mockQuantityStockRepository,
      mockLocationRepository,
      mockTransactionManager,
      mockAuditLogPort,
    );
  });

  it('debe rechazar con 400 Bad Request si hardwareItemIds contiene duplicados', async () => {
    await expect(
      useCase.execute(
        {
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
          hardwareItemIds: ['hw-1', 'hw-1'],
        },
        { id: 'user-1', role: Role.ADMIN, locationId: null },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar con 400 Bad Request si quantities contiene catálogos duplicados', async () => {
    await expect(
      useCase.execute(
        {
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
          quantities: [
            { catalogId: 'cat-1', quantity: 2 },
            { catalogId: 'cat-1', quantity: 3 },
          ],
        },
        { id: 'user-1', role: Role.ADMIN, locationId: null },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar con 403 Forbidden si un VENDEDOR traslada fuera de su puesto', async () => {
    mockLocationRepository.findById.mockImplementation(async (id: string) => {
      if (id === 'central') return new LocationEntity('central', 'Almacén Central', LocationType.ALMACEN_CENTRAL, true, new Date());
      if (id === 'puesto-other') return new LocationEntity('puesto-other', 'Puesto 200', LocationType.PUESTO, true, new Date());
      return null;
    });

    await expect(
      useCase.execute(
        {
          fromLocationId: 'central',
          toLocationId: 'puesto-other',
          hardwareItemIds: ['hw-1'],
        },
        { id: 'seller-1', role: Role.VENDEDOR, locationId: 'puesto-mine' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe ejecutar un traslado directo exitoso e inicializar en estado COMPLETED', async () => {
    const centralLoc = new LocationEntity('central', 'Almacén Central', LocationType.ALMACEN_CENTRAL, true, new Date());
    const puestoLoc = new LocationEntity('puesto-101', 'Puesto 101', LocationType.PUESTO, true, new Date());

    mockLocationRepository.findById.mockImplementation(async (id: string) => {
      if (id === 'central') return centralLoc;
      if (id === 'puesto-101') return puestoLoc;
      return null;
    });

    const hwItem = new HardwareItemEntity(
      'hw-1',
      'MP-LP-001',
      'cat-1',
      'central',
      'EN_STOCK',
      null,
      1000,
      1500,
      new Date(),
      new Date(),
    );
    mockHardwareItemRepository.findById.mockResolvedValue(hwItem);

    const fromStock = new QuantityStockEntity('stock-1', 'cat-qty', 'central', 20, 10, 15, new Date());
    mockQuantityStockRepository.findByCatalogAndLocation.mockResolvedValue(fromStock);

    const result = await useCase.execute(
      {
        fromLocationId: 'central',
        toLocationId: 'puesto-101',
        hardwareItemIds: ['hw-1'],
        quantities: [{ catalogId: 'cat-qty', quantity: 5 }],
      },
      { id: 'seller-1', role: Role.VENDEDOR, locationId: 'puesto-101' },
    );

    expect(result.status).toBe('COMPLETED');
    expect(result.type).toBe('DIRECTO');
    expect(result.code).toBe('TR-100200');
    expect(result.itemsCount).toBe(2);

    expect(mockHardwareItemRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'hw-1',
        locationId: 'puesto-101',
        status: 'EN_STOCK',
      }),
      expect.anything(),
    );

    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      'cat-qty',
      'central',
      -5,
      undefined,
      undefined,
      expect.anything(),
    );

    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      'cat-qty',
      'puesto-101',
      5,
      10, // Preserves origin costPrice
      15, // Preserves origin salePrice
      expect.anything(),
    );

    expect(mockAuditLogPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSFER_DIRECT_COMPLETED',
        payload: expect.objectContaining({
          serials: ['MP-LP-001'],
          hardwareItemIds: ['hw-1'],
        }),
      }),
    );
  });
});
