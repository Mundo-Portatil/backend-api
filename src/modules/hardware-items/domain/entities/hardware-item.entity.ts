export type ItemStatusType =
  | 'EN_STOCK'
  | 'VENDIDO'
  | 'SEGUNDA_MANO_PENDIENTE'
  | 'EN_GARANTIA'
  | 'DE_BAJA';

export class HardwareItemEntity {
  constructor(
    public readonly id: string,
    public readonly serialNumber: string,
    public readonly catalogId: string,
    public readonly locationId: string,
    public readonly status: ItemStatusType,
    public readonly parentChassisId: string | null,
    public readonly costPrice: number | null,
    public readonly salePrice: number | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly components: HardwareItemEntity[] = [],
    public readonly parentChassis: HardwareItemEntity | null = null,
  ) {}

  static create(props: {
    serialNumber: string;
    catalogId: string;
    locationId: string;
    status?: ItemStatusType;
    parentChassisId?: string | null;
    costPrice?: number | null;
    salePrice?: number | null;
  }): HardwareItemEntity {
    const serial = props.serialNumber.trim().toUpperCase();
    if (!serial) {
      throw new Error('Serial number cannot be empty');
    }
    const now = new Date();

    return new HardwareItemEntity(
      '',
      serial,
      props.catalogId,
      props.locationId,
      props.status ?? 'EN_STOCK',
      props.parentChassisId ?? null,
      props.costPrice ?? null,
      props.salePrice ?? null,
      now,
      now,
      [],
      null,
    );
  }

  attachChild(child: HardwareItemEntity): HardwareItemEntity {
    if (child.id === this.id) {
      throw new Error('An item cannot be attached to itself as a component');
    }
    if (this.parentChassisId === child.id) {
      throw new Error('Cyclic component hierarchy is not allowed');
    }
    if (child.locationId !== this.locationId) {
      throw new Error('Child component must be in the same location as parent chassis');
    }
    if (this.status !== 'EN_STOCK' || child.status !== 'EN_STOCK') {
      throw new Error('Both parent and child must be EN_STOCK to attach');
    }
    if (child.parentChassisId && child.parentChassisId !== this.id) {
      throw new Error(`Child component is already attached to chassis ${child.parentChassisId}`);
    }

    return new HardwareItemEntity(
      child.id,
      child.serialNumber,
      child.catalogId,
      this.locationId,
      child.status,
      this.id,
      child.costPrice,
      child.salePrice,
      child.createdAt,
      new Date(),
      child.components,
      this,
    );
  }

  detachChild(child: HardwareItemEntity): HardwareItemEntity {
    if (child.parentChassisId !== this.id) {
      throw new Error(`Item ${child.id} is not attached to this chassis`);
    }

    return new HardwareItemEntity(
      child.id,
      child.serialNumber,
      child.catalogId,
      this.locationId,
      child.status,
      null,
      child.costPrice,
      child.salePrice,
      child.createdAt,
      new Date(),
      child.components,
      null,
    );
  }

  decommission(reason: string): HardwareItemEntity {
    if (this.status === 'VENDIDO') {
      throw new Error('Cannot decommission an item that has already been sold');
    }
    if (!reason || !reason.trim()) {
      throw new Error('A reason is mandatory for decommissioning an item');
    }

    return new HardwareItemEntity(
      this.id,
      this.serialNumber,
      this.catalogId,
      this.locationId,
      'DE_BAJA',
      this.parentChassisId,
      this.costPrice,
      this.salePrice,
      this.createdAt,
      new Date(),
      this.components,
      this.parentChassis,
    );
  }

  updateDetails(props: {
    locationId?: string;
    catalogId?: string;
    costPrice?: number | null;
    salePrice?: number | null;
    status?: ItemStatusType;
    parentChassisId?: string | null;
  }): HardwareItemEntity {
    return new HardwareItemEntity(
      this.id,
      this.serialNumber,
      props.catalogId !== undefined ? props.catalogId : this.catalogId,
      props.locationId !== undefined ? props.locationId : this.locationId,
      props.status !== undefined ? props.status : this.status,
      props.parentChassisId !== undefined ? props.parentChassisId : this.parentChassisId,
      props.costPrice !== undefined ? props.costPrice : this.costPrice,
      props.salePrice !== undefined ? props.salePrice : this.salePrice,
      this.createdAt,
      new Date(),
      this.components,
      this.parentChassis,
    );
  }
}
