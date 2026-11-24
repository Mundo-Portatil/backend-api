import { InternalTransferItemEntity } from './internal-transfer-item.entity';

export type TransferTypeType = 'DIRECTO' | 'ENTRE_PUESTOS';
export type TransferStatusType = 'DRAFT' | 'EN_TRANSITO' | 'COMPLETED' | 'CANCELLED';

export class InternalTransferEntity {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly type: TransferTypeType,
    public readonly status: TransferStatusType,
    public readonly fromLocationId: string,
    public readonly toLocationId: string,
    public readonly createdById: string,
    public readonly receivedById: string | null,
    public readonly notes: string | null,
    public readonly cancelReason: string | null,
    public readonly dispatchedAt: Date | null,
    public readonly receivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly items: InternalTransferItemEntity[] = [],
    public readonly fromLocationName: string | null = null,
    public readonly toLocationName: string | null = null,
    public readonly createdByName: string | null = null,
    public readonly receivedByName: string | null = null,
  ) {}

  static createDirect(props: {
    code: string;
    fromLocationId: string;
    toLocationId: string;
    createdById: string;
    receivedById?: string | null;
    notes?: string | null;
    items?: InternalTransferItemEntity[];
    fromLocationName?: string | null;
    toLocationName?: string | null;
    createdByName?: string | null;
    receivedByName?: string | null;
  }): InternalTransferEntity {
    const now = new Date();
    return new InternalTransferEntity(
      '',
      props.code,
      'DIRECTO',
      'COMPLETED',
      props.fromLocationId,
      props.toLocationId,
      props.createdById,
      props.receivedById ?? props.createdById,
      props.notes ?? null,
      null,
      now,
      now,
      now,
      now,
      props.items ?? [],
      props.fromLocationName ?? null,
      props.toLocationName ?? null,
      props.createdByName ?? null,
      props.receivedByName ?? null,
    );
  }

  static createDraft(props: {
    code: string;
    fromLocationId: string;
    toLocationId: string;
    createdById: string;
    notes?: string | null;
    items?: InternalTransferItemEntity[];
    fromLocationName?: string | null;
    toLocationName?: string | null;
    createdByName?: string | null;
  }): InternalTransferEntity {
    const now = new Date();
    return new InternalTransferEntity(
      '',
      props.code,
      'ENTRE_PUESTOS',
      'DRAFT',
      props.fromLocationId,
      props.toLocationId,
      props.createdById,
      null,
      props.notes ?? null,
      null,
      null,
      null,
      now,
      now,
      props.items ?? [],
      props.fromLocationName ?? null,
      props.toLocationName ?? null,
      props.createdByName ?? null,
      null,
    );
  }

  static createDispatched(props: {
    code: string;
    fromLocationId: string;
    toLocationId: string;
    createdById: string;
    notes?: string | null;
    items?: InternalTransferItemEntity[];
    fromLocationName?: string | null;
    toLocationName?: string | null;
    createdByName?: string | null;
  }): InternalTransferEntity {
    const now = new Date();
    return new InternalTransferEntity(
      '',
      props.code,
      'ENTRE_PUESTOS',
      'EN_TRANSITO',
      props.fromLocationId,
      props.toLocationId,
      props.createdById,
      null,
      props.notes ?? null,
      null,
      now,
      null,
      now,
      now,
      props.items ?? [],
      props.fromLocationName ?? null,
      props.toLocationName ?? null,
      props.createdByName ?? null,
      null,
    );
  }

  updateDraft(props: {
    toLocationId?: string;
    notes?: string | null;
    items?: InternalTransferItemEntity[];
  }): InternalTransferEntity {
    if (this.status !== 'DRAFT') {
      throw new Error(`Solo se pueden editar transferencias en estado DRAFT (estado actual: ${this.status})`);
    }
    return new InternalTransferEntity(
      this.id,
      this.code,
      this.type,
      this.status,
      this.fromLocationId,
      props.toLocationId ?? this.toLocationId,
      this.createdById,
      this.receivedById,
      props.notes !== undefined ? props.notes : this.notes,
      this.cancelReason,
      this.dispatchedAt,
      this.receivedAt,
      this.createdAt,
      new Date(),
      props.items ?? this.items,
      this.fromLocationName,
      this.toLocationName,
      this.createdByName,
      this.receivedByName,
    );
  }

  dispatch(): InternalTransferEntity {
    if (this.status !== 'DRAFT') {
      throw new Error(`Solo transferencias en estado DRAFT pueden ser despachadas (estado actual: ${this.status})`);
    }
    const now = new Date();
    return new InternalTransferEntity(
      this.id,
      this.code,
      this.type,
      'EN_TRANSITO',
      this.fromLocationId,
      this.toLocationId,
      this.createdById,
      this.receivedById,
      this.notes,
      this.cancelReason,
      now,
      this.receivedAt,
      this.createdAt,
      now,
      this.items,
      this.fromLocationName,
      this.toLocationName,
      this.createdByName,
      this.receivedByName,
    );
  }

  confirm(receivedById: string): InternalTransferEntity {
    if (this.status !== 'EN_TRANSITO') {
      throw new Error(`Solo transferencias en estado EN_TRANSITO pueden ser confirmadas (estado actual: ${this.status})`);
    }
    const now = new Date();
    return new InternalTransferEntity(
      this.id,
      this.code,
      this.type,
      'COMPLETED',
      this.fromLocationId,
      this.toLocationId,
      this.createdById,
      receivedById,
      this.notes,
      this.cancelReason,
      this.dispatchedAt,
      now,
      this.createdAt,
      now,
      this.items,
      this.fromLocationName,
      this.toLocationName,
      this.createdByName,
      this.receivedByName,
    );
  }

  cancel(reason?: string): InternalTransferEntity {
    if (this.status === 'COMPLETED') {
      throw new Error('No se puede cancelar una transferencia que ya fue completada');
    }
    if (this.status === 'CANCELLED') {
      throw new Error('La transferencia ya se encuentra cancelada');
    }
    const now = new Date();
    return new InternalTransferEntity(
      this.id,
      this.code,
      this.type,
      'CANCELLED',
      this.fromLocationId,
      this.toLocationId,
      this.createdById,
      this.receivedById,
      this.notes,
      reason ?? this.cancelReason,
      this.dispatchedAt,
      this.receivedAt,
      this.createdAt,
      now,
      this.items,
      this.fromLocationName,
      this.toLocationName,
      this.createdByName,
      this.receivedByName,
    );
  }
}
