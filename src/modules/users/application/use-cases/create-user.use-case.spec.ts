import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.use-case';
import { UserEntity } from '../../domain/entities/user.entity';
import { LocationEntity } from '../../../locations/domain/entities/location.entity';
import { LocationType, Role } from '@prisma/client';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: any;
  let mockPasswordHasher: any;
  let mockAuditLogPort: any;
  let mockLocationRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn().mockImplementation(async (u: any) =>
        new UserEntity(
          'user-123',
          u.email,
          u.name,
          u.password,
          u.role,
          u.active,
          new Date(),
          new Date(),
          u.locationId,
          u.locationName,
        ),
      ),
    };

    mockPasswordHasher = {
      hash: jest.fn().mockImplementation(async (p: any) => `hashed_${p}`),
      compare: jest.fn().mockImplementation(async () => true),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    mockLocationRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    useCase = new CreateUserUseCase(
      mockUserRepository,
      mockPasswordHasher,
      mockAuditLogPort,
      mockLocationRepository,
    );
  });

  it('debe crear un usuario ADMIN con locationId en null automáticamente', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute({
      email: 'admin@mundoportatil.pe',
      name: 'Admin Global',
      password: 'password123',
      role: Role.ADMIN,
      locationId: 'some-location-id', // Should be forced to null
    });

    expect(result.role).toBe(Role.ADMIN);
    expect(result.locationId).toBeNull();
    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.ADMIN,
        locationId: null,
      }),
    );
  });

  it('debe auto-asignar ALMACEN_CENTRAL a ENCARGADO_ALMACEN si no especifica ubicación', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockLocationRepository.findAll.mockResolvedValue([
      new LocationEntity('central-loc-id', 'Almacén Central Principal', LocationType.ALMACEN_CENTRAL, true, new Date()),
    ]);

    const result = await useCase.execute({
      email: 'almacen@mundoportatil.pe',
      name: 'Jefe Almacén',
      password: 'password123',
      role: Role.ENCARGADO_ALMACEN,
    });

    expect(result.role).toBe(Role.ENCARGADO_ALMACEN);
    expect(result.locationId).toBe('central-loc-id');
    expect(result.locationName).toBe('Almacén Central Principal');
  });

  it('debe rechazar VENDEDOR si no proporciona puesto', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'vendedor@mundoportatil.pe',
        name: 'Vendedor 1',
        password: 'password123',
        role: Role.VENDEDOR,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar VENDEDOR si la ubicación asignada no es de tipo PUESTO', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockLocationRepository.findById.mockResolvedValue(
      new LocationEntity('central-id', 'Almacén Central', LocationType.ALMACEN_CENTRAL, true, new Date()),
    );

    await expect(
      useCase.execute({
        email: 'vendedor@mundoportatil.pe',
        name: 'Vendedor 1',
        password: 'password123',
        role: Role.VENDEDOR,
        locationId: 'central-id',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe crear VENDEDOR exitosamente si se asigna un PUESTO activo', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockLocationRepository.findById.mockResolvedValue(
      new LocationEntity('puesto-101', 'Puesto 101', LocationType.PUESTO, true, new Date()),
    );

    const result = await useCase.execute({
      email: 'vendedor@mundoportatil.pe',
      name: 'Vendedor 1',
      password: 'password123',
      role: Role.VENDEDOR,
      locationId: 'puesto-101',
    });

    expect(result.role).toBe(Role.VENDEDOR);
    expect(result.locationId).toBe('puesto-101');
    expect(result.locationName).toBe('Puesto 101');
  });

  it('debe rechazar si el correo ya está registrado', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-id' });

    await expect(
      useCase.execute({
        email: 'existing@mundoportatil.pe',
        name: 'Duplicado',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
