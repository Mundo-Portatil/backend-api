import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/ports/out/user-repository.port';
import type { UserRepositoryPort } from '../../domain/ports/out/user-repository.port';
import { PASSWORD_HASHER } from '../../../../shared/domain/ports/password-hasher.port';
import type { PasswordHasherPort } from '../../../../shared/domain/ports/password-hasher.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import type { UserEntity } from '../../domain/entities/user.entity';
import type { UpdateUserCommandDto } from '../dto/update-user-command.dto';
import type { UserResponseDto } from '../dto/user-response.dto';
import { Role, LocationType } from '@prisma/client';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
  ) {}

  async execute(
    id: string,
    dto: UpdateUserCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const effectiveRole = dto.role ?? existing.role;
    let targetLocationId = dto.locationId !== undefined ? dto.locationId : existing.locationId;

    if (effectiveRole === Role.ADMIN) {
      targetLocationId = null;
    } else if (effectiveRole === Role.ENCARGADO_ALMACEN) {
      if (targetLocationId) {
        const loc = await this.locationRepository.findById(targetLocationId);
        if (!loc || !loc.active) {
          throw new BadRequestException('La ubicación asignada no existe o se encuentra inactiva');
        }
        targetLocationId = loc.id;
      } else {
        const locations = await this.locationRepository.findAll({ active: true });
        const central = locations.find((l) => l.type === LocationType.ALMACEN_CENTRAL && l.active);
        if (!central) {
          throw new BadRequestException('No se encontró un Almacén Central activo configurado en el sistema');
        }
        targetLocationId = central.id;
      }
    } else if (effectiveRole === Role.VENDEDOR || effectiveRole === Role.TECNICO) {
      if (!targetLocationId) {
        throw new BadRequestException('La asignación de un puesto es obligatoria para vendedores y técnicos');
      }
      const loc = await this.locationRepository.findById(targetLocationId);
      if (!loc || !loc.active) {
        throw new BadRequestException('El puesto asignado no existe o se encuentra inactivo');
      }
      if (loc.type !== LocationType.PUESTO) {
        throw new BadRequestException('El personal de ventas y técnico solo puede ser asignado a ubicaciones de tipo PUESTO');
      }
      targetLocationId = loc.id;
    }

    const updates: {
      name?: string;
      role?: Role;
      active?: boolean;
      password?: string;
      locationId?: string | null;
    } = {};

    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.active !== undefined) updates.active = dto.active;
    if (dto.password) {
      updates.password = await this.passwordHasher.hash(dto.password);
    }
    if (targetLocationId !== existing.locationId) {
      updates.locationId = targetLocationId;
    }

    const updated = await this.userRepository.update(id, updates as Partial<UserEntity>);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'UPDATE_USER',
      module: 'users',
      payload: {
        id: updated.id,
        changes: {
          name: dto.name,
          role: dto.role,
          active: dto.active,
          locationId: targetLocationId,
          passwordUpdated: !!dto.password,
        },
      },
      ipAddress,
    });

    return updated.sanitize();
  }
}
