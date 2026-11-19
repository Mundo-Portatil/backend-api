import { Inject, Injectable } from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type {
  HardwareItemFilterOptions,
  HardwareItemRepositoryPort,
} from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class GetHardwareItemsUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
  ) {}

  async execute(options?: HardwareItemFilterOptions): Promise<{
    items: HardwareItemResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;

    const result = await this.hardwareItemRepository.findAll({
      ...options,
      page,
      limit,
    });

    return {
      items: result.items.map((item) => ({
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
      })),
      total: result.total,
      page,
      limit,
    };
  }
}
