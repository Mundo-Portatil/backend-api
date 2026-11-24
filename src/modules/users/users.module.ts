import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/ports/out/user-repository.port';
import { PASSWORD_HASHER } from '../../shared/domain/ports/password-hasher.port';
import { BcryptHasherAdapter } from '../../shared/infrastructure/security/bcrypt-hasher.adapter';
import { PrismaUserRepository } from './infrastructure/adapters/out/persistence/prisma-user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { GetUsersUseCase } from './application/use-cases/get-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UpdateOwnProfileUseCase } from './application/use-cases/update-own-profile.use-case';
import { UsersController } from './infrastructure/adapters/in/http/users.controller';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [LocationsModule],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    GetUsersUseCase,
    UpdateUserUseCase,
    UpdateOwnProfileUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptHasherAdapter,
    },
  ],
  exports: [
    USER_REPOSITORY,
    CreateUserUseCase,
    GetUsersUseCase,
    UpdateUserUseCase,
    UpdateOwnProfileUseCase,
  ],
})
export class UsersModule {}
