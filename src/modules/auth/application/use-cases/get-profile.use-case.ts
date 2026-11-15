import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../users/domain/ports/out/user-repository.port';
import type { UserRepositoryPort } from '../../../users/domain/ports/out/user-repository.port';
import type { Role } from '@prisma/client';

export interface UserProfileDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
    };
  }
}
