import {
  ConflictException,
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
import type { UpdateOwnProfileCommandDto } from '../dto/update-own-profile-command.dto';
import type { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class UpdateOwnProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    userId: string,
    dto: UpdateOwnProfileCommandDto,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updates: {
      email?: string;
      name?: string;
      password?: string;
    } = {};

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== existing.email.toLowerCase()) {
        const emailInUse = await this.userRepository.findByEmail(normalizedEmail);
        if (emailInUse && emailInUse.id !== userId) {
          throw new ConflictException(`El correo ${dto.email} ya está registrado`);
        }
        updates.email = normalizedEmail;
      }
    }

    if (dto.name !== undefined) {
      updates.name = dto.name.trim();
    }

    if (dto.password) {
      updates.password = await this.passwordHasher.hash(dto.password);
    }

    const updated = await this.userRepository.update(
      userId,
      updates as Partial<UserEntity>,
    );

    await this.auditLogPort.record({
      userId,
      action: 'UPDATE_PROFILE',
      module: 'users',
      payload: {
        id: updated.id,
        changes: {
          email: updates.email,
          name: updates.name,
          passwordUpdated: !!dto.password,
        },
      },
      ipAddress,
    });

    return updated.sanitize();
  }
}
