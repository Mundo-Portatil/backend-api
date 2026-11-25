import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { ItemStatusType } from '../../domain/entities/hardware-item.entity';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

export interface UpdateHardwareItemCommandDto {
  locationId?: string;
  costPrice?: number;
  salePrice?: number;
  status?: ItemStatusType;
}

@Injectable()
export class UpdateHardwareItemUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    id: string,
    dto: UpdateHardwareItemCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<HardwareItemResponseDto> {
    const existing = await this.hardwareItemRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Hardware item with ID "${id}" not found`);
    }

    if (dto.locationId && dto.locationId !== existing.locationId) {
      const location = await this.locationRepository.findById(dto.locationId);
      if (!location || !location.active) {
        throw new BadRequestException('A valid active location is required');
      }
    }

    const updatedEntity = existing.updateDetails(dto);
    const saved = await this.hardwareItemRepository.update(updatedEntity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'UPDATE_HARDWARE_ITEM',
      module: 'hardware-items',
      payload: {
        id: saved.id,
        serialNumber: saved.serialNumber,
        changes: dto,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      serialNumber: saved.serialNumber,
      catalogId: saved.catalogId,
      locationId: saved.locationId,
      status: saved.status,
      parentChassisId: saved.parentChassisId,
      costPrice: saved.costPrice,
      salePrice: saved.salePrice,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
