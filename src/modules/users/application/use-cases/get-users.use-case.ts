import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/ports/out/user-repository.port';
import type { UserRepositoryPort } from '../../domain/ports/out/user-repository.port';
import type { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class GetUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((u) => u.sanitize());
  }
}
