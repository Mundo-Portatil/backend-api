import { Role } from '@prisma/client';

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  locationId: string | null;
  locationName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
