import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../users/domain/ports/out/user-repository.port';
import type { UserRepositoryPort } from '../../../users/domain/ports/out/user-repository.port';
import { PASSWORD_HASHER } from '../../../../shared/domain/ports/password-hasher.port';
import type { PasswordHasherPort } from '../../../../shared/domain/ports/password-hasher.port';
import { TOKEN_SERVICE } from '../../domain/ports/out/token-service.port';
import type { TokenServicePort } from '../../domain/ports/out/token-service.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { LoginCommandDto } from '../dto/login-command.dto';
import type { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(dto: LoginCommandDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
    }

    const isPasswordValid = await this.passwordHasher.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
    }

    const token = this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      locationId: user.locationId,
      locationName: user.locationName,
    });

    await this.auditLogPort.record({
      userId: user.id,
      action: 'LOGIN',
      module: 'auth',
      payload: {
        email: user.email,
        role: user.role,
        locationId: user.locationId,
      },
      ipAddress: dto.ipAddress,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        locationId: user.locationId,
        locationName: user.locationName,
      },
    };
  }
}
