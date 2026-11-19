import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class GetHardwareItemDetailUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
  ) {}

  async execute(id: string): Promise<HardwareItemResponseDto> {
    const item = await this.hardwareItemRepository.findById(id, {
      parent: true,
      components: true,
    });

    if (!item) {
      throw new NotFoundException(`Hardware item with ID "${id}" not found`);
    }

    return {
      id: item.id,
      serialNumber: item.serialNumber,
      catalogId: item.catalogId,
      locationId: item.locationId,
      status: item.status,
      parentChassisId: item.parentChassisId,
      costPrice: item.costPrice,
      salePrice: item.salePrice,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      components: item.components.map((c) => ({
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
      parentChassis: item.parentChassis
        ? {
            id: item.parentChassis.id,
            serialNumber: item.parentChassis.serialNumber,
            catalogId: item.parentChassis.catalogId,
            locationId: item.parentChassis.locationId,
            status: item.parentChassis.status,
            parentChassisId: item.parentChassis.parentChassisId,
            costPrice: item.parentChassis.costPrice,
            salePrice: item.parentChassis.salePrice,
            createdAt: item.parentChassis.createdAt,
            updatedAt: item.parentChassis.updatedAt,
          }
        : null,
    };
  }
}
