import { Module } from '@nestjs/common';
import { LOCATION_REPOSITORY } from './domain/ports/out/location-repository.port';
import { PrismaLocationRepository } from './infrastructure/adapters/out/persistence/prisma-location.repository';
import { CreateLocationUseCase } from './application/use-cases/create-location.use-case';
import { GetLocationsUseCase } from './application/use-cases/get-locations.use-case';
import { UpdateLocationUseCase } from './application/use-cases/update-location.use-case';
import { LocationsController } from './infrastructure/adapters/in/http/locations.controller';

@Module({
  controllers: [LocationsController],
  providers: [
    CreateLocationUseCase,
    GetLocationsUseCase,
    UpdateLocationUseCase,
    {
      provide: LOCATION_REPOSITORY,
      useClass: PrismaLocationRepository,
    },
  ],
  exports: [
    LOCATION_REPOSITORY,
    CreateLocationUseCase,
    GetLocationsUseCase,
    UpdateLocationUseCase,
  ],
})
export class LocationsModule {}
