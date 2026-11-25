import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../domain/ports/out/category-repository.port';
import type { CategoryRepositoryPort } from '../../domain/ports/out/category-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { CategoryEntity } from '../../domain/entities/category.entity';
import type { CreateCategoryCommandDto } from '../dto/create-category-command.dto';
import type { CategoryResponseDto } from '../dto/category-response.dto';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: CreateCategoryCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Category with name "${dto.name}" already exists`);
    }

    const entity = CategoryEntity.create({
      name: dto.name,
      description: dto.description,
      active: dto.active,
    });

    const created = await this.categoryRepository.save(entity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'CREATE_CATEGORY',
      module: 'categories',
      payload: {
        id: created.id,
        name: created.name,
        active: created.active,
      },
      ipAddress,
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      active: created.active,
      createdAt: created.createdAt,
    };
  }
}
