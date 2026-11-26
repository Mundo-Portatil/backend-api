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
    public readonly companyId: string,
    public readonly status: ItemStatusType,
    public readonly color: string | null = null,
    public readonly parentChassisId: string | null = null,
    public readonly costPrice: number | null = null,
    public readonly salePrice: number | null = null,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly components: HardwareItemEntity[] = [],
    public readonly parentChassis: HardwareItemEntity | null = null,
    public readonly companyName: string | null = null,
    public readonly companyRuc: string | null = null,
  ) {}

  static create(props: {
    serialNumber: string;
    catalogId: string;
    locationId: string;
    companyId: string;
    color?: string | null;
    status?: ItemStatusType;
    parentChassisId?: string | null;
    costPrice?: number | null;
    salePrice?: number | null;
  }): HardwareItemEntity {
    const serial = props.serialNumber.trim().toUpperCase();
    if (!serial) {
      throw new Error('Serial number cannot be empty');
    }
    if (!props.companyId) {
      throw new Error('Company ID is required for hardware item');
    }
    const color = props.color?.trim() || null;
    const now = new Date();

    return new HardwareItemEntity(
      '',
      serial,
      props.catalogId,
      props.locationId,
      props.companyId,
      props.status ?? 'EN_STOCK',
      color,
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
      child.companyId,
      child.status,
      child.color,
      this.id,
      child.costPrice,
      child.salePrice,
      child.createdAt,
      new Date(),
      child.components,
      this,
      child.companyName,
      child.companyRuc,
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
      child.companyId,
      child.status,
      child.color,
      null,
      child.costPrice,
      child.salePrice,
      child.createdAt,
      new Date(),
      child.components,
      null,
      child.companyName,
      child.companyRuc,
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
      this.companyId,
      'DE_BAJA',
      this.color,
      this.parentChassisId,
      this.costPrice,
      this.salePrice,
      this.createdAt,
      new Date(),
      this.components,
      this.parentChassis,
      this.companyName,
      this.companyRuc,
    );
  }

  updateDetails(props: {
    locationId?: string;
    catalogId?: string;
    companyId?: string;
    color?: string | null;
    costPrice?: number | null;
    salePrice?: number | null;
    status?: ItemStatusType;
    parentChassisId?: string | null;
  }): HardwareItemEntity {
    const updatedColor = props.color !== undefined ? (props.color?.trim() || null) : this.color;
    return new HardwareItemEntity(
      this.id,
      this.serialNumber,
      props.catalogId !== undefined ? props.catalogId : this.catalogId,
      props.locationId !== undefined ? props.locationId : this.locationId,
      props.companyId !== undefined ? props.companyId : this.companyId,
      props.status !== undefined ? props.status : this.status,
      updatedColor,
      props.parentChassisId !== undefined ? props.parentChassisId : this.parentChassisId,
      props.costPrice !== undefined ? props.costPrice : this.costPrice,
      props.salePrice !== undefined ? props.salePrice : this.salePrice,
      this.createdAt,
      new Date(),
      this.components,
      this.parentChassis,
      this.companyName,
      this.companyRuc,
    );
  }

  transferDirect(newLocationId: string): HardwareItemEntity {
    if (this.status !== 'EN_STOCK') {
      throw new Error(
        `El ítem con serie ${this.serialNumber} debe estar EN_STOCK para traslado directo (estado actual: ${this.status})`,
      );
    }
    return new HardwareItemEntity(
      this.id,
      this.serialNumber,
      this.catalogId,
      newLocationId,
      this.companyId,
      'EN_STOCK',
      this.color,
      this.parentChassisId,
      this.costPrice,
      this.salePrice,
      this.createdAt,
      new Date(),
      this.components,
      this.parentChassis,
      this.companyName,
      this.companyRuc,
    );
  }
}
