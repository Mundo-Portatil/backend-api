import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UnifiedInventoryInboundUseCase } from './unified-inventory-inbound.use-case';
import { LocationEntity } from '../../../locations/domain/entities/location.entity';
import { CatalogItemEntity } from '../../../catalog/domain/entities/catalog-item.entity';
import { CompanyEntity } from '../../../companies/domain/entities/company.entity';
import { LocationType } from '@prisma/client';

describe('UnifiedInventoryInboundUseCase', () => {
  let useCase: UnifiedInventoryInboundUseCase;
  let mockCatalogRepository: any;
  let mockLocationRepository: any;
  let mockQuantityStockRepository: any;
  let mockHardwareItemRepository: any;
  let mockCompanyRepository: any;
  let mockTransactionManager: any;
  let mockAuditLogPort: any;

  beforeEach(() => {
    mockCatalogRepository = {
      findById: jest.fn(),
    };

    mockLocationRepository = {
      findAll: jest.fn().mockResolvedValue([
        new LocationEntity('loc-central', 'Almacén Central', LocationType.ALMACEN_CENTRAL, true, new Date()),
      ]),
    };

    mockQuantityStockRepository = {
      upsert: jest.fn().mockImplementation(async (catId: any, locId: any, compId: any, qty: any) => ({
        id: 'qs-1',
        catalogId: catId,
        locationId: locId,
        companyId: compId,
        quantity: qty,
      })),
    };

    mockHardwareItemRepository = {
      findExistingSerials: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (item: any) => item),
    };

    mockCompanyRepository = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'comp-a') {
          return new CompanyEntity('comp-a', 'Empresa A', '20601111111', 'Dir A', true, new Date(), new Date());
        }
        if (id === 'comp-b') {
          return new CompanyEntity('comp-b', 'Empresa B', '20602222222', 'Dir B', true, new Date(), new Date());
        }
        if (id === 'comp-inactive') {
          return new CompanyEntity('comp-inactive', 'Empresa Inactiva', '20603333333', 'Dir C', false, new Date(), new Date());
        }
        return null;
      }),
    };

    mockTransactionManager = {
      runInTransaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new UnifiedInventoryInboundUseCase(
      mockCatalogRepository,
      mockLocationRepository,
      mockQuantityStockRepository,
      mockHardwareItemRepository,
      mockCompanyRepository,
      mockTransactionManager,
      mockAuditLogPort,
    );
  });

  it('debe registrar un ingreso serializado dividiendo cantidades por empresa y guardando colores', async () => {
    const catalog = CatalogItemEntity.create({
      sku: 'LP-ACER-A515',
      brand: 'Acer',
      model: 'Aspire 5',
      categoryId: 'cat-laptop',
      isSerialized: true,
      minStockThreshold: 2,
      basePrice: 2000,
      isSecondHand: false,
      active: true,
    });
    mockCatalogRepository.findById.mockResolvedValue(catalog);

    const result = await useCase.execute({
      items: [
        {
          catalogId: catalog.id,
          quantity: 3,
          hasSerialNumbers: true,
          serialEntries: [
            { serialNumber: 'SN-001', color: 'Negro', companyId: 'comp-a' },
            { serialNumber: 'SN-002', color: 'Plata', companyId: 'comp-a' },
            { serialNumber: 'SN-003', color: 'Negro', companyId: 'comp-b' },
          ],
        },
      ],
    });

    expect(result.totalUnits).toBe(3);
    expect(result.results[0].serialsCreated).toEqual(['SN-001', 'SN-002', 'SN-003']);

    // Verifica que HardwareItem se haya guardado con color y companyId
    expect(mockHardwareItemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        serialNumber: 'SN-001',
        color: 'Negro',
        companyId: 'comp-a',
      }),
      expect.anything(),
    );

    expect(mockHardwareItemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        serialNumber: 'SN-003',
        color: 'Negro',
        companyId: 'comp-b',
      }),
      expect.anything(),
    );

    // Verifica que QuantityStock se haya incrementado en 2 para comp-a y en 1 para comp-b
    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      catalog.id,
      'loc-central',
      'comp-a',
      2,
      undefined,
      2000,
      expect.anything(),
    );

    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      catalog.id,
      'loc-central',
      'comp-b',
      1,
      undefined,
      2000,
      expect.anything(),
    );
  });

  it('debe registrar un ingreso cuantitativo exigiendo companyId', async () => {
    const catalog = CatalogItemEntity.create({
      sku: 'MO-LOGI-G203',
      brand: 'Logitech',
      model: 'G203 Lightsync',
      categoryId: 'cat-mouse',
      isSerialized: false,
      minStockThreshold: 5,
      basePrice: 85,
      isSecondHand: false,
      active: true,
    });
    mockCatalogRepository.findById.mockResolvedValue(catalog);

    const result = await useCase.execute({
      items: [
        {
          catalogId: catalog.id,
          quantity: 15,
          hasSerialNumbers: false,
          companyId: 'comp-a',
          costPrice: 50,
          salePrice: 85,
        },
      ],
    });

    expect(result.totalUnits).toBe(15);
    expect(mockQuantityStockRepository.upsert).toHaveBeenCalledWith(
      catalog.id,
      'loc-central',
      'comp-a',
      15,
      50,
      85,
      expect.anything(),
    );
  });

  it('debe rechazar si la empresa no existe o está inactiva', async () => {
    const catalog = CatalogItemEntity.create({
      sku: 'MO-TEST',
      brand: 'Test',
      model: 'Test',
      categoryId: 'cat-1',
      isSerialized: false,
      minStockThreshold: 1,
      basePrice: 10,
      isSecondHand: false,
      active: true,
    });
    mockCatalogRepository.findById.mockResolvedValue(catalog);

    // Inactiva
    await expect(
      useCase.execute({
        items: [
          {
            catalogId: catalog.id,
            quantity: 5,
            hasSerialNumbers: false,
            companyId: 'comp-inactive',
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    // No existe
    await expect(
      useCase.execute({
        items: [
          {
            catalogId: catalog.id,
            quantity: 5,
            hasSerialNumbers: false,
            companyId: 'comp-nonexistent',
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
