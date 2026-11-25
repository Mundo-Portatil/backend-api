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
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { AvailableSerialResponseDto } from '../dto/available-serial-response.dto';

@Injectable()
export class GetAvailableSerialsUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
  ) {}

  async execute(params: {
    catalogId: string;
    locationId?: string;
  }): Promise<AvailableSerialResponseDto[]> {
    const catalogItem = await this.catalogRepository.findById(params.catalogId);
    if (!catalogItem) {
      throw new NotFoundException(`Catalog item with ID "${params.catalogId}" not found`);
    }

    let targetLocationId = params.locationId;
    if (targetLocationId) {
      const loc = await this.locationRepository.findById(targetLocationId);
      if (!loc) {
        throw new NotFoundException(`Location with ID "${targetLocationId}" not found`);
      }
      if (!loc.active) {
        throw new BadRequestException(`Location "${loc.name}" is inactive`);
      }
    } else {
      const locations = await this.locationRepository.findAll({ active: true });
      const central = locations.find((l) => l.type === 'ALMACEN_CENTRAL');
      if (!central) {
        throw new NotFoundException('Active central warehouse (ALMACEN_CENTRAL) not found');
      }
      targetLocationId = central.id;
    }

    const result = await this.hardwareItemRepository.findAll({
      catalogItemId: params.catalogId,
      locationId: targetLocationId,
      status: 'EN_STOCK',
      limit: 1000,
    });

    return result.items.map((item) => ({
      id: item.id,
      serialNumber: item.serialNumber,
      catalogId: item.catalogId,
      locationId: item.locationId,
      salePrice: item.salePrice,
      createdAt: item.createdAt,
    }));
  }
}
