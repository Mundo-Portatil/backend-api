import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../domain/ports/out/category-repository.port';
import type { CategoryRepositoryPort } from '../../domain/ports/out/category-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { UpdateCategoryCommandDto } from '../dto/update-category-command.dto';
import type { CategoryResponseDto } from '../dto/category-response.dto';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    id: string,
    dto: UpdateCategoryCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.categoryRepository.findByName(dto.name);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Category with name "${dto.name}" already exists`);
      }
    }

    const updatedEntity = existing.updateDetails(dto);
    const saved = await this.categoryRepository.update(updatedEntity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'UPDATE_CATEGORY',
      module: 'categories',
      payload: {
        id: saved.id,
        changes: dto,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      active: saved.active,
      createdAt: saved.createdAt,
    };
  }
}
