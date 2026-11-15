import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { UserEntity } from '../../../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../../../domain/ports/out/user-repository.port';
import { UserMapper } from './user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: UserMapper.toPersistenceCreate(user),
    });
    return UserMapper.toDomain(created);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const raw = await this.prisma.user.findUnique({
      where: { id },
    });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const raw = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(UserMapper.toDomain);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: UserMapper.toPersistenceUpdate(data),
    });
    return UserMapper.toDomain(updated);
  }
}
