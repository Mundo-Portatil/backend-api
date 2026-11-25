import { InternalTransferItemEntity } from './internal-transfer-item.entity';

export type TransferTypeType = 'DIRECTO';
export type TransferStatusType = 'COMPLETED';

export class InternalTransferEntity {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly type: TransferTypeType,
    public readonly status: TransferStatusType,
    public readonly fromLocationId: string,
    public readonly toLocationId: string,
    public readonly createdById: string,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly items: InternalTransferItemEntity[] = [],
    public readonly fromLocationName: string | null = null,
    public readonly toLocationName: string | null = null,
    public readonly createdByName: string | null = null,
  ) {}

  static createDirect(props: {
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
      'DIRECTO',
      'COMPLETED',
      props.fromLocationId,
      props.toLocationId,
      props.createdById,
      props.notes ?? null,
      now,
      now,
      props.items ?? [],
      props.fromLocationName ?? null,
      props.toLocationName ?? null,
      props.createdByName ?? null,
    );
  }
}
