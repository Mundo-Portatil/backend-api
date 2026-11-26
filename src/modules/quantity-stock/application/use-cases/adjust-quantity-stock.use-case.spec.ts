import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdjustQuantityStockUseCase } from './adjust-quantity-stock.use-case';
import { LocationEntity } from '../../../locations/domain/entities/location.entity';
import { CatalogItemEntity } from '../../../catalog/domain/entities/catalog-item.entity';
import { CompanyEntity } from '../../../companies/domain/entities/company.entity';
import { QuantityStockEntity } from '../../domain/entities/quantity-stock.entity';
import { LocationType } from '@prisma/client';

describe('AdjustQuantityStockUseCase', () => {
  let useCase: AdjustQuantityStockUseCase;
  let mockQuantityStockRepository: any;
  let mockHardwareItemRepository: any;
  let mockCatalogRepository: any;
  let mockLocationRepository: any;
  let mockCompanyRepository: any;
  let mockAuditLogPort: any;

  beforeEach(() => {
    mockLocationRepository = {
      findById: jest.fn().mockResolvedValue(
        new LocationEntity('loc-1', 'Puesto 102', LocationType.PUESTO, true, new Date()),
      ),
    };

    mockCatalogRepository = {
      findById: jest.fn().mockResolvedValue(
        CatalogItemEntity.create({
          sku: 'MO-G203',
          brand: 'Logitech',
          model: 'G203',
          categoryId: 'cat-1',
          isSerialized: false,
          minStockThreshold: 2,
          basePrice: 80,
          isSecondHand: false,
          active: true,
        }),
      ),
    };

    mockCompanyRepository = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'comp-1') {
          return new CompanyEntity('comp-1', 'Mundo Portátil S.A.C.', '20601234567', 'Dir', true, new Date(), new Date());
        }
        return null;
      }),
    };

    mockHardwareItemRepository = {
      countByCatalogAndLocationAndStatus: jest.fn().mockResolvedValue(0),
    };

    mockQuantityStockRepository = {
      findByCatalogLocationAndCompany: jest.fn(),
      save: jest.fn().mockImplementation(async (s: any) => ({ ...s, id: 'qs-created' })),
      update: jest.fn().mockImplementation(async (s: any) => s),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new AdjustQuantityStockUseCase(
      mockQuantityStockRepository,
      mockHardwareItemRepository,
      mockCatalogRepository,
      mockLocationRepository,
      mockCompanyRepository,
      mockAuditLogPort,
    );
  });

  it('debe ajustar exitosamente el stock para la combinación (catalogId, locationId, companyId)', async () => {
    const existingStock = new QuantityStockEntity(
      'qs-1',
      'cat-1',
      'loc-1',
      'comp-1',
      10,
      50,
      80,
      new Date(),
    );
    mockQuantityStockRepository.findByCatalogLocationAndCompany.mockResolvedValue(existingStock);

    const result = await useCase.execute({
      catalogId: 'cat-1',
      locationId: 'loc-1',
      companyId: 'comp-1',
      newQuantity: 7,
      reason: 'Conteo mensual físico - 3 mermas',
    });

    expect(result.quantity).toBe(7);
    expect(result.companyId).toBe('comp-1');
    expect(result.companyName).toBe('Mundo Portátil S.A.C.');
    expect(mockQuantityStockRepository.update).toHaveBeenCalled();
    expect(mockAuditLogPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADJUST_QUANTITY_STOCK',
      }),
    );
  });

  it('debe bloquear el ajuste global si existen series físicas activas para esa empresa', async () => {
    mockHardwareItemRepository.countByCatalogAndLocationAndStatus.mockResolvedValue(4);

    await expect(
      useCase.execute({
        catalogId: 'cat-1',
        locationId: 'loc-1',
        companyId: 'comp-1',
        newQuantity: 5,
        reason: 'Ajuste no permitido',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar con 404 si la empresa no existe', async () => {
    await expect(
      useCase.execute({
        catalogId: 'cat-1',
        locationId: 'loc-1',
        companyId: 'comp-unknown',
        newQuantity: 5,
        reason: 'Test',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
