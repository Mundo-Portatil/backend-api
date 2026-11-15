import {
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
import { UserEntity } from '../../domain/entities/user.entity';
import type { CreateUserCommandDto } from '../dto/create-user-command.dto';
import type { UserResponseDto } from '../dto/user-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
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

    const hashedPassword = await this.passwordHasher.hash(dto.password);
    const entity = UserEntity.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
      role: dto.role ?? Role.VENDEDOR,
      active: true,
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
        active: created.active,
      },
      ipAddress,
    });

    return created.sanitize();
  }
}
