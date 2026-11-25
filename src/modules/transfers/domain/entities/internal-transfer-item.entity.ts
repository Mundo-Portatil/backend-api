export class InternalTransferItemEntity {
  constructor(
    public readonly id: string,
    public readonly transferId: string,
    public readonly catalogId: string,
    public readonly hardwareItemId: string | null = null,
    public readonly quantity: number = 1,
    public readonly serialNumber: string | null = null,
    public readonly sku: string | null = null,
    public readonly model: string | null = null,
    public readonly brand: string | null = null,
  ) {}

  static create(props: {
    transferId: string;
    catalogId: string;
    hardwareItemId?: string | null;
    quantity?: number;
    serialNumber?: string | null;
    sku?: string | null;
    model?: string | null;
    brand?: string | null;
  }): InternalTransferItemEntity {
    return new InternalTransferItemEntity(
      '',
      props.transferId,
      props.catalogId,
      props.hardwareItemId ?? null,
      props.quantity ?? 1,
      props.serialNumber ?? null,
      props.sku ?? null,
      props.model ?? null,
      props.brand ?? null,
    );
  }
}
