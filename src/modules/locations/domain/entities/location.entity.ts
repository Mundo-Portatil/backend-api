import { LocationType } from '@prisma/client';

export class LocationEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: LocationType,
    public readonly active: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    name: string;
    type?: LocationType;
    active?: boolean;
  }): LocationEntity {
    return new LocationEntity(
      '',
      props.name.trim(),
      props.type ?? LocationType.PUESTO,
      props.active ?? true,
      new Date(),
    );
  }
}
