import { LocationEntity } from '../../entities/location.entity';

export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY');

export interface LocationFilterOptions {
  active?: boolean;
}

export interface LocationRepositoryPort {
  create(location: LocationEntity): Promise<LocationEntity>;
  findById(id: string): Promise<LocationEntity | null>;
  findAll(filter?: LocationFilterOptions): Promise<LocationEntity[]>;
  update(id: string, data: Partial<LocationEntity>): Promise<LocationEntity>;
}
