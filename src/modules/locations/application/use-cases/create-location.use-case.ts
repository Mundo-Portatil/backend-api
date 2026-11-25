import { Inject, Injectable } from '@nestjs/common';
import { LOCATION_REPOSITORY } from '../../domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { LocationEntity } from '../../domain/entities/location.entity';
import type { CreateLocationCommandDto } from '../dto/create-location-command.dto';
import type { LocationResponseDto } from '../dto/location-response.dto';

@Injectable()
export class CreateLocationUseCase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: CreateLocationCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<LocationResponseDto> {
    const entity = LocationEntity.create({
      name: dto.name,
      type: dto.type,
      active: true,
    });

    const created = await this.locationRepository.create(entity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'CREATE_LOCATION',
      module: 'locations',
      payload: {
        id: created.id,
        name: created.name,
        type: created.type,
      },
      ipAddress,
    });

    return {
      id: created.id,
      name: created.name,
      type: created.type,
      active: created.active,
      createdAt: created.createdAt,
    };
  }
}
