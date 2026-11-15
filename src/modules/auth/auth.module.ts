import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { PASSWORD_HASHER } from '../../shared/domain/ports/password-hasher.port';
import { BcryptHasherAdapter } from '../../shared/infrastructure/security/bcrypt-hasher.adapter';
import { TOKEN_SERVICE } from './domain/ports/out/token-service.port';
import { JwtTokenAdapter } from './infrastructure/adapters/out/security/jwt-token.adapter';
import { JwtStrategy } from './infrastructure/adapters/in/http/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/adapters/in/http/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/adapters/in/http/guards/roles.guard';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case';
import { AuthController } from './infrastructure/adapters/in/http/auth.controller';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'default-jwt-secret-key-12345678',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    GetProfileUseCase,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenAdapter,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptHasherAdapter,
    },
  ],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    PassportModule,
    JwtModule,
    TOKEN_SERVICE,
    PASSWORD_HASHER,
  ],
})
export class AuthModule {}
