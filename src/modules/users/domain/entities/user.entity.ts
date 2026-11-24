import { Role } from '@prisma/client';

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
    public readonly role: Role,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly locationId: string | null = null,
    public readonly locationName: string | null = null,
  ) {}

  static create(props: {
    email: string;
    name: string;
    password: string;
    role: Role;
    active?: boolean;
    locationId?: string | null;
    locationName?: string | null;
  }): UserEntity {
    const now = new Date();
    return new UserEntity(
      '',
      props.email.trim().toLowerCase(),
      props.name.trim(),
      props.password,
      props.role,
      props.active ?? true,
      now,
      now,
      props.locationId ?? null,
      props.locationName ?? null,
    );
  }

  sanitize(): Omit<UserEntity, 'password' | 'sanitize'> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      active: this.active,
      locationId: this.locationId,
      locationName: this.locationName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
