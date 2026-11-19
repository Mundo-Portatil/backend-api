export class CategoryEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly active: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    name: string;
    description?: string;
    active?: boolean;
  }): CategoryEntity {
    const trimmedName = props.name.trim();
    if (!trimmedName) {
      throw new Error('Category name cannot be empty');
    }

    return new CategoryEntity(
      '',
      trimmedName,
      props.description?.trim() ?? null,
      props.active ?? true,
      new Date(),
    );
  }

  deactivate(): CategoryEntity {
    return new CategoryEntity(
      this.id,
      this.name,
      this.description,
      false,
      this.createdAt,
    );
  }

  updateDetails(props: {
    name?: string;
    description?: string;
    active?: boolean;
  }): CategoryEntity {
    const name = props.name !== undefined ? props.name.trim() : this.name;
    if (!name) {
      throw new Error('Category name cannot be empty');
    }

    return new CategoryEntity(
      this.id,
      name,
      props.description !== undefined ? props.description?.trim() || null : this.description,
      props.active !== undefined ? props.active : this.active,
      this.createdAt,
    );
  }
}
