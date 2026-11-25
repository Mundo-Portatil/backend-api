import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateServiceOrderUseCase } from './create-service-order.use-case';
import { LocationEntity } from '../../../locations/domain/entities/location.entity';
import { LocationType } from '@prisma/client';

describe('CreateServiceOrderUseCase', () => {
  let useCase: CreateServiceOrderUseCase;
  let mockServiceOrderRepository: any;
  let mockCodeGenerator: any;
  let mockLocationRepository: any;
  let mockAuditLogPort: any;

  beforeEach(() => {
    mockServiceOrderRepository = {
      save: jest.fn().mockImplementation(async (order: any) => ({
        ...order,
        id: 'so-1',
      })),
    };

    mockCodeGenerator = {
      generateCode: jest.fn().mockResolvedValue('OS-123456'),
    };

    mockLocationRepository = {
      findById: jest.fn(),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new CreateServiceOrderUseCase(
      mockServiceOrderRepository,
      mockCodeGenerator,
      mockLocationRepository,
      mockAuditLogPort,
    );
  });

  it('debe arrojar 403 Forbidden si un técnico no tiene puesto asignado', async () => {
    await expect(
      useCase.execute({
        customerName: 'Cliente Test',
        deviceBrand: 'HP',
        deviceModel: 'Pavilion',
        reportedIssue: 'Pantalla rota',
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: null,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe arrojar 403 Forbidden si un técnico intenta registrar en un puesto ajeno', async () => {
    await expect(
      useCase.execute({
        locationId: 'loc-puesto-2',
        customerName: 'Cliente Test',
        deviceBrand: 'HP',
        deviceModel: 'Pavilion',
        reportedIssue: 'Pantalla rota',
        userId: 'tech-1',
        userRole: 'TECNICO',
        userLocationId: 'loc-puesto-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe arrojar 400 Bad Request si un administrador no especifica locationId', async () => {
    await expect(
      useCase.execute({
        customerName: 'Cliente Test',
        deviceBrand: 'HP',
        deviceModel: 'Pavilion',
        reportedIssue: 'Pantalla rota',
        userId: 'admin-1',
        userRole: 'ADMIN',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar 404 si el puesto no existe o está inactivo', async () => {
    mockLocationRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        locationId: 'loc-invalid',
        customerName: 'Cliente Test',
        deviceBrand: 'HP',
        deviceModel: 'Pavilion',
        reportedIssue: 'Pantalla rota',
        userId: 'admin-1',
        userRole: 'ADMIN',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe arrojar 400 Bad Request si la ubicación no es tipo PUESTO', async () => {
    mockLocationRepository.findById.mockResolvedValue(
      new LocationEntity('loc-almacen', 'Almacén Central', LocationType.ALMACEN_CENTRAL, true, new Date()),
    );

    await expect(
      useCase.execute({
        locationId: 'loc-almacen',
        customerName: 'Cliente Test',
        deviceBrand: 'HP',
        deviceModel: 'Pavilion',
        reportedIssue: 'Pantalla rota',
        userId: 'admin-1',
        userRole: 'ADMIN',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe crear exitosamente la orden con estado RECIBIDO para técnico en su propio puesto', async () => {
    mockLocationRepository.findById.mockResolvedValue(
      new LocationEntity('loc-puesto-1', 'Puesto 1', LocationType.PUESTO, true, new Date()),
    );

    const result = await useCase.execute({
      customerName: 'María García',
      customerPhone: '987654321',
      deviceBrand: 'Lenovo',
      deviceModel: 'IdeaPad 3',
      reportedIssue: 'Bisagra rota',
      laborCost: 50.0,
      userId: 'tech-1',
      userRole: 'TECNICO',
      userLocationId: 'loc-puesto-1',
      userName: 'Técnico Especialista',
    });

    expect(result.id).toBe('so-1');
    expect(result.code).toBe('OS-123456');
    expect(result.status).toBe('RECIBIDO');
    expect(result.locationId).toBe('loc-puesto-1');
    expect(result.laborCost).toBe(50.0);
    expect(result.partsTotal).toBe(0);
    expect(result.totalAmount).toBe(50.0);
    expect(mockAuditLogPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SERVICE_ORDER_CREATED',
        userId: 'tech-1',
      }),
    );
  });
});
