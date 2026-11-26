import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateCompanyUseCase } from './create-company.use-case';
import { CompanyEntity } from '../../domain/entities/company.entity';

describe('CreateCompanyUseCase', () => {
  let useCase: CreateCompanyUseCase;
  let mockCompanyRepository: any;
  let mockAuditLogPort: any;

  beforeEach(() => {
    mockCompanyRepository = {
      save: jest.fn().mockImplementation(async (c: any) => ({
        ...c,
        id: 'comp-uuid-1',
      })),
      findByName: jest.fn().mockResolvedValue(null),
      findByRuc: jest.fn().mockResolvedValue(null),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new CreateCompanyUseCase(mockCompanyRepository, mockAuditLogPort);
  });

  it('debe crear exitosamente una empresa con RUC de 11 dígitos y emitir auditoría', async () => {
    const result = await useCase.execute(
      {
        name: 'Mundo Portátil S.A.C.',
        ruc: '20601234567',
        address: 'Av. Bolognesi 123, Tacna',
      },
      'admin-1',
      '127.0.0.1',
    );

    expect(result.id).toBe('comp-uuid-1');
    expect(result.name).toBe('Mundo Portátil S.A.C.');
    expect(result.ruc).toBe('20601234567');
    expect(result.active).toBe(true);

    expect(mockCompanyRepository.save).toHaveBeenCalled();
    expect(mockAuditLogPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE_COMPANY',
        module: 'companies',
        userId: 'admin-1',
      }),
    );
  });

  it('debe rechazar con 400 Bad Request si el RUC no tiene exactamente 11 dígitos numéricos', async () => {
    await expect(
      useCase.execute({
        name: 'Empresa Test',
        ruc: '12345',
        address: 'Calle Real 100',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute({
        name: 'Empresa Test',
        ruc: '2060123456A',
        address: 'Calle Real 100',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar con 409 Conflict si ya existe una empresa con el mismo nombre', async () => {
    mockCompanyRepository.findByName.mockResolvedValue(
      new CompanyEntity('existing-id', 'Mundo Portátil S.A.C.', '20609999999', 'Dirección', true, new Date(), new Date()),
    );

    await expect(
      useCase.execute({
        name: 'Mundo Portátil S.A.C.',
        ruc: '20601234567',
        address: 'Av. Bolognesi 123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe rechazar con 409 Conflict si ya existe una empresa con el mismo RUC', async () => {
    mockCompanyRepository.findByRuc.mockResolvedValue(
      new CompanyEntity('existing-id', 'Otra Empresa', '20601234567', 'Dirección', true, new Date(), new Date()),
    );

    await expect(
      useCase.execute({
        name: 'Nueva Empresa',
        ruc: '20601234567',
        address: 'Av. Bolognesi 123',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
