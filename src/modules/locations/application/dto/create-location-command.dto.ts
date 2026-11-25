import { LocationType } from '@prisma/client';

export interface CreateLocationCommandDto {
  name: string;
  type?: LocationType;
}
