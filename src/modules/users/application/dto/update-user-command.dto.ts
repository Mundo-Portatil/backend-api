import { Role } from '@prisma/client';

export interface UpdateUserCommandDto {
  name?: string;
  role?: Role;
  active?: boolean;
  password?: string;
}
