import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { USER_REPOSITORY } from '../../../../../../users/domain/ports/out/user-repository.port';
import type { UserRepositoryPort } from '../../../../../../users/domain/ports/out/user-repository.port';
import type { JwtPayload } from '../../../../../domain/ports/out/token-service.port';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-jwt-secret-key-12345678',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException('Token inválido o usuario inactivo');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      locationId: user.locationId,
      locationName: user.locationName,
    };
  }
}
