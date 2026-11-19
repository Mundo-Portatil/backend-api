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
export class AttachHardwareChildUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    parentId: string,
    childIds: string[],
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<HardwareItemResponseDto> {
    if (!childIds || childIds.length === 0) {
      throw new BadRequestException('At least one child ID is required to attach');
    }

    const parent = await this.hardwareItemRepository.findById(parentId, { components: true });
    if (!parent) {
      throw new NotFoundException(`Parent chassis with ID "${parentId}" not found`);
    }

    const updatedChildren = [];
    for (const childId of childIds) {
      const child = await this.hardwareItemRepository.findById(childId);
      if (!child) {
        throw new NotFoundException(`Child component with ID "${childId}" not found`);
      }

      // Validates invariants
      const attachedChild = parent.attachChild(child);
      const savedChild = await this.hardwareItemRepository.update(attachedChild);
      updatedChildren.push(savedChild);
    }

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'ATTACH_HARDWARE_CHILD',
      module: 'hardware-items',
      payload: {
        parentId,
        parentSerialNumber: parent.serialNumber,
        childIds,
      },
      ipAddress,
    });

    const refreshedParent = await this.hardwareItemRepository.findById(parentId, {
      components: true,
    });

    return {
      id: refreshedParent!.id,
      serialNumber: refreshedParent!.serialNumber,
      catalogId: refreshedParent!.catalogId,
      locationId: refreshedParent!.locationId,
      status: refreshedParent!.status,
      parentChassisId: refreshedParent!.parentChassisId,
      costPrice: refreshedParent!.costPrice,
      salePrice: refreshedParent!.salePrice,
      createdAt: refreshedParent!.createdAt,
      updatedAt: refreshedParent!.updatedAt,
      components: refreshedParent!.components.map((c) => ({
        id: c.id,
        serialNumber: c.serialNumber,
        catalogId: c.catalogId,
        locationId: c.locationId,
        status: c.status,
        parentChassisId: c.parentChassisId,
        costPrice: c.costPrice,
        salePrice: c.salePrice,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }
}
