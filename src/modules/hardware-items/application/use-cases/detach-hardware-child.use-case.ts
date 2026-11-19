import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class DetachHardwareChildUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    parentId: string,
    childId: string,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<HardwareItemResponseDto> {
    const parent = await this.hardwareItemRepository.findById(parentId);
    if (!parent) {
      throw new NotFoundException(`Parent chassis with ID "${parentId}" not found`);
    }

    const child = await this.hardwareItemRepository.findById(childId);
    if (!child) {
      throw new NotFoundException(`Child component with ID "${childId}" not found`);
    }

    if (child.parentChassisId !== parentId) {
      throw new BadRequestException(
        `Child component "${child.serialNumber}" is not attached to chassis "${parent.serialNumber}"`,
      );
    }

    const detachedChild = parent.detachChild(child);
    const savedChild = await this.hardwareItemRepository.update(detachedChild);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'DETACH_HARDWARE_CHILD',
      module: 'hardware-items',
      payload: {
        parentId,
        parentSerialNumber: parent.serialNumber,
        childId,
        childSerialNumber: child.serialNumber,
      },
      ipAddress,
    });

    return {
      id: savedChild.id,
      serialNumber: savedChild.serialNumber,
      catalogId: savedChild.catalogId,
      locationId: savedChild.locationId,
      status: savedChild.status,
      parentChassisId: null,
      costPrice: savedChild.costPrice,
      salePrice: savedChild.salePrice,
      createdAt: savedChild.createdAt,
      updatedAt: savedChild.updatedAt,
    };
  }
}
