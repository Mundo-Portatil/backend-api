import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LOCATION_REPOSITORY } from '../../domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { LocationEntity } from '../../domain/entities/location.entity';
import type { UpdateLocationCommandDto } from '../dto/update-location-command.dto';
import type { LocationResponseDto } from '../dto/location-response.dto';

@Injectable()
export class UpdateLocationUseCase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    id: string,
    dto: UpdateLocationCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<LocationResponseDto> {
    const existing = await this.locationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Ubicación con ID ${id} no encontrada`);
    }

    const updates: {
      name?: string;
      active?: boolean;
    } = {};
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.active !== undefined) updates.active = dto.active;

    const updated = await this.locationRepository.update(id, updates as Partial<LocationEntity>);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'UPDATE_LOCATION',
      module: 'locations',
      payload: {
        id: updated.id,
        changes: dto,
      },
      ipAddress,
    });

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      active: updated.active,
      createdAt: updated.createdAt,
    };
  }
}
