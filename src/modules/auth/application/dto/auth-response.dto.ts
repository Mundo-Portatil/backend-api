import { Role } from '@prisma/client';

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  locationId: string | null;
  locationName: string | null;
}

export interface AuthResponseDto {
  access_token: string;
  user: AuthUserDto;
}
