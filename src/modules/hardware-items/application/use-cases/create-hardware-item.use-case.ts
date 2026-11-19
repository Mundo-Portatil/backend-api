import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import { SERIAL_GENERATOR_PORT } from '../../domain/ports/out/serial-generator.port';
import type { SerialGeneratorPort } from '../../domain/ports/out/serial-generator.port';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/ports/out/catalog-repository.port';
import type { CatalogRepositoryPort } from '../../../catalog/domain/ports/out/catalog-repository.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { HardwareItemEntity } from '../../domain/entities/hardware-item.entity';
import type { CreateHardwareItemCommandDto } from '../dto/create-hardware-item-command.dto';
import type { HardwareItemResponseDto } from '../dto/hardware-item-response.dto';

@Injectable()
export class CreateHardwareItemUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
    @Inject(SERIAL_GENERATOR_PORT)
    private readonly serialGenerator: SerialGeneratorPort,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepositoryPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: CreateHardwareItemCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<HardwareItemResponseDto> {
    const location = await this.locationRepository.findById(dto.locationId);
    if (!location || !location.active) {
      throw new BadRequestException('A valid active location is required');
    }

    const catalogItem = await this.catalogRepository.findById(dto.catalogId);
    if (!catalogItem || !catalogItem.active) {
      throw new BadRequestException('A valid active catalog item is required');
    }
    if (!catalogItem.isSerialized) {
      throw new BadRequestException('Catalog item is not serialized');
    }

    const serialNumber = dto.serialNumber
      ? dto.serialNumber.trim().toUpperCase()
      : this.serialGenerator.generateInternalSerial();

    const existing = await this.hardwareItemRepository.findBySerialNumber(serialNumber);
    if (existing) {
      throw new ConflictException(`Hardware item with serial number "${serialNumber}" already exists`);
    }

    if (dto.parentChassisId) {
      const parent = await this.hardwareItemRepository.findById(dto.parentChassisId);
      if (!parent) {
        throw new BadRequestException(`Parent chassis with ID "${dto.parentChassisId}" not found`);
      }
      if (parent.locationId !== dto.locationId) {
        throw new BadRequestException('Child component must be in the same location as the parent chassis');
      }
    }

    const entity = HardwareItemEntity.create({
      serialNumber,
      catalogId: dto.catalogId,
      locationId: dto.locationId,
      status: dto.status ?? 'EN_STOCK',
      parentChassisId: dto.parentChassisId,
      costPrice: dto.costPrice,
      salePrice: dto.salePrice ?? catalogItem.basePrice,
    });

    const saved = await this.hardwareItemRepository.save(entity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'CREATE_HARDWARE_ITEM',
      module: 'hardware-items',
      payload: {
        id: saved.id,
        serialNumber: saved.serialNumber,
        catalogId: saved.catalogId,
        locationId: saved.locationId,
        parentChassisId: saved.parentChassisId,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      serialNumber: saved.serialNumber,
      catalogId: saved.catalogId,
      locationId: saved.locationId,
      status: saved.status,
      parentChassisId: saved.parentChassisId,
      costPrice: saved.costPrice,
      salePrice: saved.salePrice,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
