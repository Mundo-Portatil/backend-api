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
  ) {}

  static create(props: {
    email: string;
    name: string;
    password: string;
    role: Role;
    active?: boolean;
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
    );
  }

  sanitize(): Omit<UserEntity, 'password' | 'sanitize'> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
