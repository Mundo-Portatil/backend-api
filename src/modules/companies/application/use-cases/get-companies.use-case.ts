import { Inject, Injectable } from '@nestjs/common';
import { COMPANY_REPOSITORY } from '../../domain/ports/out/company-repository.port';
import type {
  CompanyFilterOptions,
  CompanyRepositoryPort,
} from '../../domain/ports/out/company-repository.port';
import type { CompanyResponseDto } from '../dto/company-response.dto';

@Injectable()
export class GetCompaniesUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepositoryPort,
  ) {}

  async execute(options?: CompanyFilterOptions): Promise<CompanyResponseDto[]> {
    const companies = await this.companyRepository.findAll(options);
    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      ruc: c.ruc,
      address: c.address,
      active: c.active,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
}
