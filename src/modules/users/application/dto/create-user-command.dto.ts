import { Role } from '@prisma/client';

export interface CreateUserCommandDto {
  email: string;
  name: string;
  password: string;
  role?: Role;
}
