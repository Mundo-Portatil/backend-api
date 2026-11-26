export class CompanyEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly ruc: string,
    public readonly address: string,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    if (!this.name || !this.name.trim()) {
      throw new Error('El nombre de la empresa no puede estar vacío');
    }
    if (!this.ruc || !/^\d{11}$/.test(this.ruc.trim())) {
      throw new Error('El RUC debe tener exactamente 11 dígitos numéricos');
    }
    if (!this.address || !this.address.trim()) {
      throw new Error('La dirección de la empresa no puede estar vacía');
    }
  }

  static create(props: {
    name: string;
    ruc: string;
    address: string;
    active?: boolean;
  }): CompanyEntity {
    const trimmedName = props.name?.trim();
    const trimmedRuc = props.ruc?.trim();
    const trimmedAddress = props.address?.trim();
    const now = new Date();

    return new CompanyEntity(
      '',
      trimmedName,
      trimmedRuc,
      trimmedAddress,
      props.active ?? true,
      now,
      now,
    );
  }

  update(props: {
    name?: string;
    ruc?: string;
    address?: string;
    active?: boolean;
  }): CompanyEntity {
    const newName = props.name !== undefined ? props.name.trim() : this.name;
    const newRuc = props.ruc !== undefined ? props.ruc.trim() : this.ruc;
    const newAddress = props.address !== undefined ? props.address.trim() : this.address;
    const newActive = props.active !== undefined ? props.active : this.active;

    return new CompanyEntity(
      this.id,
      newName,
      newRuc,
      newAddress,
      newActive,
      this.createdAt,
      new Date(),
    );
  }
}
