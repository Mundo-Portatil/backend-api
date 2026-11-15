import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { LocationEntity } from '../../../../domain/entities/location.entity';
import type {
  LocationFilterOptions,
  LocationRepositoryPort,
} from '../../../../domain/ports/out/location-repository.port';
import { LocationMapper } from './location.mapper';

@Injectable()
export class PrismaLocationRepository implements LocationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(location: LocationEntity): Promise<LocationEntity> {
    const created = await this.prisma.location.create({
      data: LocationMapper.toPersistenceCreate(location),
    });
    return LocationMapper.toDomain(created);
  }

  async findById(id: string): Promise<LocationEntity | null> {
    const raw = await this.prisma.location.findUnique({
      where: { id },
    });
    return raw ? LocationMapper.toDomain(raw) : null;
  }

  async findAll(filter?: LocationFilterOptions): Promise<LocationEntity[]> {
    const where = filter?.active !== undefined ? { active: filter.active } : {};
    const locations = await this.prisma.location.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return locations.map(LocationMapper.toDomain);
  }

  async update(id: string, data: Partial<LocationEntity>): Promise<LocationEntity> {
    const updated = await this.prisma.location.update({
      where: { id },
      data: LocationMapper.toPersistenceUpdate(data),
    });
    return LocationMapper.toDomain(updated);
  }
}
