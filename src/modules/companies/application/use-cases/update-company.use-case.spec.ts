import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateCompanyUseCase } from './update-company.use-case';
import { CompanyEntity } from '../../domain/entities/company.entity';

describe('UpdateCompanyUseCase', () => {
  let useCase: UpdateCompanyUseCase;
  let mockCompanyRepository: any;
  let mockAuditLogPort: any;

  beforeEach(() => {
    const existing = new CompanyEntity(
      'comp-1',
      'Mundo Portátil S.A.C.',
      '20601234567',
      'Av. Bolognesi 123',
      true,
      new Date(),
      new Date(),
    );

    mockCompanyRepository = {
      findById: jest.fn().mockImplementation(async (id: string) => (id === 'comp-1' ? existing : null)),
      findByName: jest.fn().mockResolvedValue(null),
      findByRuc: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(async (c: any) => c),
    };

    mockAuditLogPort = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    useCase = new UpdateCompanyUseCase(mockCompanyRepository, mockAuditLogPort);
  });

  it('debe actualizar exitosamente una empresa y registrar auditoría', async () => {
    const result = await useCase.execute(
      'comp-1',
      { name: 'Mundo Portátil Tech S.A.C.', address: 'Av. Pinto 456' },
      'admin-1',
      '127.0.0.1',
    );

    expect(result.name).toBe('Mundo Portátil Tech S.A.C.');
    expect(result.address).toBe('Av. Pinto 456');
    expect(mockCompanyRepository.update).toHaveBeenCalled();
    expect(mockAuditLogPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE_COMPANY',
        module: 'companies',
      }),
    );
  });

  it('debe lanzar 404 si la empresa no existe', async () => {
    await expect(
      useCase.execute('comp-unknown', { name: 'Test' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe lanzar 409 si el nuevo nombre colisiona con otra empresa', async () => {
    mockCompanyRepository.findByName.mockResolvedValue(
      new CompanyEntity('other-comp', 'Nombre Existente', '20609999999', 'Dir', true, new Date(), new Date()),
    );

    await expect(
      useCase.execute('comp-1', { name: 'Nombre Existente' }),
    ).rejects.toThrow(ConflictException);
  });
});
