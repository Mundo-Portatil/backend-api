import { Module } from '@nestjs/common';
import { COMPANY_REPOSITORY } from './domain/ports/out/company-repository.port';
import { PrismaCompanyRepository } from './infrastructure/adapters/out/persistence/prisma-company.repository';
import { CreateCompanyUseCase } from './application/use-cases/create-company.use-case';
import { GetCompaniesUseCase } from './application/use-cases/get-companies.use-case';
import { UpdateCompanyUseCase } from './application/use-cases/update-company.use-case';
import { CompaniesController } from './infrastructure/adapters/in/http/companies.controller';

@Module({
  controllers: [CompaniesController],
  providers: [
    {
      provide: COMPANY_REPOSITORY,
      useClass: PrismaCompanyRepository,
    },
    CreateCompanyUseCase,
    GetCompaniesUseCase,
    UpdateCompanyUseCase,
  ],
  exports: [
    COMPANY_REPOSITORY,
    CreateCompanyUseCase,
    GetCompaniesUseCase,
    UpdateCompanyUseCase,
  ],
})
export class CompaniesModule {}
