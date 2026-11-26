import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COMPANY_REPOSITORY } from '../../domain/ports/out/company-repository.port';
import type { CompanyRepositoryPort } from '../../domain/ports/out/company-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { UpdateCompanyCommandDto } from '../dto/update-company-command.dto';
import type { CompanyResponseDto } from '../dto/company-response.dto';

@Injectable()
export class UpdateCompanyUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    id: string,
    dto: UpdateCompanyCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<CompanyResponseDto> {
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Empresa con ID "${id}" no encontrada`);
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('El nombre de la empresa no puede estar vacío');
      }
      const existingByName = await this.companyRepository.findByName(trimmedName);
      if (existingByName && existingByName.id !== id) {
        throw new ConflictException(`Ya existe otra empresa con el nombre "${trimmedName}"`);
      }
    }

    if (dto.ruc !== undefined) {
      const trimmedRuc = dto.ruc.trim();
      if (!trimmedRuc || !/^\d{11}$/.test(trimmedRuc)) {
        throw new BadRequestException('El RUC debe tener exactamente 11 dígitos numéricos');
      }
      const existingByRuc = await this.companyRepository.findByRuc(trimmedRuc);
      if (existingByRuc && existingByRuc.id !== id) {
        throw new ConflictException(`Ya existe otra empresa con el RUC "${trimmedRuc}"`);
      }
    }

    if (dto.address !== undefined) {
      const trimmedAddress = dto.address.trim();
      if (!trimmedAddress) {
        throw new BadRequestException('La dirección fiscal no puede estar vacía');
      }
    }

    const updatedEntity = existing.update(dto);
    const saved = await this.companyRepository.update(updatedEntity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'UPDATE_COMPANY',
      module: 'companies',
      payload: {
        id: saved.id,
        changes: dto,
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
