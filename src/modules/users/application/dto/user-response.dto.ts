import { Role } from '@prisma/client';

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
