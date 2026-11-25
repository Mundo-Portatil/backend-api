import { Inject, Injectable } from '@nestjs/common';
import { LOCATION_REPOSITORY } from '../../domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../domain/ports/out/location-repository.port';
import type { LocationResponseDto } from '../dto/location-response.dto';

@Injectable()
export class GetLocationsUseCase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
  ) {}

  async execute(active?: boolean): Promise<LocationResponseDto[]> {
    const locations = await this.locationRepository.findAll(
      active !== undefined ? { active } : undefined,
    );

    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      active: loc.active,
      createdAt: loc.createdAt,
    }));
  }
}
