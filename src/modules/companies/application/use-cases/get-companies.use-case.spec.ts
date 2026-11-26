import { jest } from '@jest/globals';
import { GetCompaniesUseCase } from './get-companies.use-case';
import { CompanyEntity } from '../../domain/entities/company.entity';

describe('GetCompaniesUseCase', () => {
  let useCase: GetCompaniesUseCase;
  let mockCompanyRepository: any;

  beforeEach(() => {
    mockCompanyRepository = {
      findAll: jest.fn().mockImplementation(async (options?: any) => {
        const list = [
          new CompanyEntity('c-1', 'Empresa 1', '20601111111', 'Dir 1', true, new Date(), new Date()),
          new CompanyEntity('c-2', 'Empresa 2', '20602222222', 'Dir 2', false, new Date(), new Date()),
        ];
        if (options?.active !== undefined) {
          return list.filter((c) => c.active === options.active);
        }
        return list;
      }),
    };

    useCase = new GetCompaniesUseCase(mockCompanyRepository);
  });

  it('debe listar todas las empresas', async () => {
    const result = await useCase.execute();
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('c-1');
  });

  it('debe filtrar empresas activas', async () => {
    const result = await useCase.execute({ active: true });
    expect(result.length).toBe(1);
    expect(result[0].active).toBe(true);
  });
});
