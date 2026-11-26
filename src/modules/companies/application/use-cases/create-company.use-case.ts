import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { COMPANY_REPOSITORY } from '../../domain/ports/out/company-repository.port';
import type { CompanyRepositoryPort } from '../../domain/ports/out/company-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { CompanyEntity } from '../../domain/entities/company.entity';
import type { CreateCompanyCommandDto } from '../dto/create-company-command.dto';
import type { CompanyResponseDto } from '../dto/company-response.dto';

@Injectable()
export class CreateCompanyUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: CreateCompanyCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<CompanyResponseDto> {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestException('El nombre de la empresa no puede estar vacío');
    }

    const trimmedRuc = dto.ruc?.trim();
    if (!trimmedRuc || !/^\d{11}$/.test(trimmedRuc)) {
      throw new BadRequestException('El RUC debe tener exactamente 11 dígitos numéricos');
    }

    const trimmedAddress = dto.address?.trim();
    if (!trimmedAddress) {
      throw new BadRequestException('La dirección fiscal no puede estar vacía');
    }

    const existingByName = await this.companyRepository.findByName(trimmedName);
    if (existingByName) {
      throw new ConflictException(`Ya existe una empresa registrada con el nombre "${trimmedName}"`);
    }

    const existingByRuc = await this.companyRepository.findByRuc(trimmedRuc);
    if (existingByRuc) {
      throw new ConflictException(`Ya existe una empresa registrada con el RUC "${trimmedRuc}"`);
    }

    const entity = CompanyEntity.create({
      name: trimmedName,
      ruc: trimmedRuc,
      address: trimmedAddress,
      active: dto.active ?? true,
    });

    const saved = await this.companyRepository.save(entity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'CREATE_COMPANY',
      module: 'companies',
      payload: {
        id: saved.id,
        name: saved.name,
        ruc: saved.ruc,
        address: saved.address,
        active: saved.active,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      name: saved.name,
      ruc: saved.ruc,
      address: saved.address,
      active: saved.active,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
