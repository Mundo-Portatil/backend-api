import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class ScanHardwareItemUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
  ) {}

  async execute(code: string): Promise<HardwareItemResponseDto> {
    const cleanCode = code.trim().toUpperCase();
    const item = await this.hardwareItemRepository.findBySerialNumber(cleanCode, {
      parent: true,
      components: true,
    });

    if (!item) {
      throw new NotFoundException(`Hardware item with serial/code "${code}" not found`);
    }

    return {
      id: item.id,
      serialNumber: item.serialNumber,
      color: item.color,
      companyId: item.companyId,
      companyName: item.companyName,
      companyRuc: item.companyRuc,
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
        color: c.color,
        companyId: c.companyId,
        companyName: c.companyName,
        companyRuc: c.companyRuc,
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
            color: item.parentChassis.color,
            companyId: item.parentChassis.companyId,
            companyName: item.parentChassis.companyName,
            companyRuc: item.parentChassis.companyRuc,
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
