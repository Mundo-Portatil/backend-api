import { jest } from '@jest/globals';
import { GetAuditLogsUseCase } from './get-audit-logs.use-case';
import { AuditLogRepositoryPort } from '../../domain/ports/out/audit-log-repository.port';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';

describe('GetAuditLogsUseCase', () => {
  let useCase: GetAuditLogsUseCase;
  let repository: jest.Mocked<AuditLogRepositoryPort>;

  beforeEach(() => {
    repository = {
      insert: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<AuditLogRepositoryPort>;

    useCase = new GetAuditLogsUseCase(repository);
  });

  it('should call repository.findMany with default pagination and filters', async () => {
    repository.findMany.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const result = await useCase.execute({});

    expect(repository.findMany).toHaveBeenCalledWith({
      module: undefined,
      userId: undefined,
      excludeAction: undefined,
      startDate: undefined,
      endDate: undefined,
      page: 1,
      limit: 20,
    });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should pass excludeAction, startDate, and endDate when provided', async () => {
    const mockLog = new AuditLogEntity(
      'log-1',
      'user-1',
      'CREATE_USER',
      'users',
      null,
      '127.0.0.1',
      new Date(),
    );

    repository.findMany.mockResolvedValue({
      items: [mockLog],
      total: 1,
      page: 2,
      limit: 10,
    });

    const result = await useCase.execute({
      module: 'users',
      userId: 'user-1',
      excludeAction: 'LOGIN',
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.999Z',
      page: 2,
      limit: 10,
    });

    expect(repository.findMany).toHaveBeenCalledWith({
      module: 'users',
      userId: 'user-1',
      excludeAction: 'LOGIN',
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.999Z'),
      page: 2,
      limit: 10,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
