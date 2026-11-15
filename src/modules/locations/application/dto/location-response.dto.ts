import { LocationType } from '@prisma/client';

export interface LocationResponseDto {
  id: string;
  name: string;
  type: LocationType;
  active: boolean;
  createdAt: Date;
}
