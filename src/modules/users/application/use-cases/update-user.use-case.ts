import {
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
import type { UserEntity } from '../../domain/entities/user.entity';
import type { UpdateUserCommandDto } from '../dto/update-user-command.dto';
import type { UserResponseDto } from '../dto/user-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
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

    const updates: {
      name?: string;
      role?: Role;
      active?: boolean;
      password?: string;
    } = {};

    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.active !== undefined) updates.active = dto.active;
    if (dto.password) {
      updates.password = await this.passwordHasher.hash(dto.password);
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
          passwordUpdated: !!dto.password,
        },
      },
      ipAddress,
    });

    return updated.sanitize();
  }
}
