import { CompanyEntity } from '../../entities/company.entity';

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');

export interface CompanyFilterOptions {
  active?: boolean;
  search?: string;
}

export interface CompanyRepositoryPort {
  save(company: CompanyEntity, tx?: unknown): Promise<CompanyEntity>;
  findById(id: string, tx?: unknown): Promise<CompanyEntity | null>;
  findByName(name: string, tx?: unknown): Promise<CompanyEntity | null>;
  findByRuc(ruc: string, tx?: unknown): Promise<CompanyEntity | null>;
  findAll(options?: CompanyFilterOptions): Promise<CompanyEntity[]>;
  update(company: CompanyEntity, tx?: unknown): Promise<CompanyEntity>;
}
