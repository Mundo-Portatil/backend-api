import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/ports/out/user-repository.port';
import type { UserRepositoryPort } from '../../domain/ports/out/user-repository.port';
import { PASSWORD_HASHER } from '../../../../shared/domain/ports/password-hasher.port';
import type { PasswordHasherPort } from '../../../../shared/domain/ports/password-hasher.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { UserEntity } from '../../domain/entities/user.entity';
import type { CreateUserCommandDto } from '../dto/create-user-command.dto';
import type { UserResponseDto } from '../dto/user-response.dto';
import { Role, LocationType } from '@prisma/client';

@Injectable()
export class CreateUserUseCase {
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
    dto: CreateUserCommandDto,
    authorUserId?: string,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`El correo ${dto.email} ya está registrado`);
    }

    const role = dto.role ?? Role.VENDEDOR;
    let resolvedLocationId: string | null = null;
    let resolvedLocationName: string | null = null;

    if (role === Role.ADMIN) {
      resolvedLocationId = null;
    } else if (role === Role.ENCARGADO_ALMACEN) {
      if (dto.locationId) {
        const loc = await this.locationRepository.findById(dto.locationId);
        if (!loc || !loc.active) {
          throw new BadRequestException('La ubicación asignada no existe o se encuentra inactiva');
        }
        resolvedLocationId = loc.id;
        resolvedLocationName = loc.name;
      } else {
        const locations = await this.locationRepository.findAll({ active: true });
        const central = locations.find((l) => l.type === LocationType.ALMACEN_CENTRAL && l.active);
        if (!central) {
          throw new BadRequestException('No se encontró un Almacén Central activo configurado en el sistema');
        }
        resolvedLocationId = central.id;
        resolvedLocationName = central.name;
      }
    } else if (role === Role.VENDEDOR || role === Role.TECNICO) {
      if (!dto.locationId) {
        throw new BadRequestException('La asignación de un puesto es obligatoria para vendedores y técnicos');
      }
      const loc = await this.locationRepository.findById(dto.locationId);
      if (!loc || !loc.active) {
        throw new BadRequestException('El puesto asignado no existe o se encuentra inactivo');
      }
      if (loc.type !== LocationType.PUESTO) {
        throw new BadRequestException('El personal de ventas y técnico solo puede ser asignado a ubicaciones de tipo PUESTO');
      }
      resolvedLocationId = loc.id;
      resolvedLocationName = loc.name;
    }

    const hashedPassword = await this.passwordHasher.hash(dto.password);
    const entity = UserEntity.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
      role,
      active: true,
      locationId: resolvedLocationId,
      locationName: resolvedLocationName,
    });

    const created = await this.userRepository.create(entity);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: 'CREATE_USER',
      module: 'users',
      payload: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
        locationId: created.locationId,
        active: created.active,
      },
      ipAddress,
    });

    return created.sanitize();
  }
}
