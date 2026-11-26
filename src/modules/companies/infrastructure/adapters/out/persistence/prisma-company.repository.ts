import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import type {
  CompanyFilterOptions,
  CompanyRepositoryPort,
} from '../../../../domain/ports/out/company-repository.port';
import { CompanyMapper } from './company.mapper';

type PrismaClientOrTx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PrismaCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): PrismaClientOrTx {
    return (tx as Prisma.TransactionClient) || this.prisma;
  }

  async save(company: CompanyEntity, tx?: unknown): Promise<CompanyEntity> {
    const client = this.getClient(tx);
    const data = CompanyMapper.toPersistence(company);
    const created = await client.company.create({
      data,
    });
    return CompanyMapper.toDomain(created);
  }

  async findById(id: string, tx?: unknown): Promise<CompanyEntity | null> {
    const client = this.getClient(tx);
    const raw = await client.company.findUnique({
      where: { id },
    });
    return raw ? CompanyMapper.toDomain(raw) : null;
  }

  async findByName(name: string, tx?: unknown): Promise<CompanyEntity | null> {
    const client = this.getClient(tx);
    const raw = await client.company.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });
    return raw ? CompanyMapper.toDomain(raw) : null;
  }

  async findByRuc(ruc: string, tx?: unknown): Promise<CompanyEntity | null> {
    const client = this.getClient(tx);
    const raw = await client.company.findUnique({
      where: { ruc: ruc.trim() },
    });
    return raw ? CompanyMapper.toDomain(raw) : null;
  }

  async findAll(options?: CompanyFilterOptions): Promise<CompanyEntity[]> {
    const where: Prisma.CompanyWhereInput = {};

    if (options?.active !== undefined) {
      where.active = options.active;
    }

    if (options?.search) {
      const search = options.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ruc: { contains: search } },
      ];
    }

    const companies = await this.prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return companies.map(CompanyMapper.toDomain);
  }

  async update(company: CompanyEntity, tx?: unknown): Promise<CompanyEntity> {
    const client = this.getClient(tx);
    const data = CompanyMapper.toPersistence(company);
    const updated = await client.company.update({
      where: { id: company.id },
      data,
    });
    return CompanyMapper.toDomain(updated);
  }
}
