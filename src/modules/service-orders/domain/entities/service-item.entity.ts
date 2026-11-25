export class ServiceItemEntity {
  constructor(
    public readonly id: string,
    public readonly serviceOrderId: string,
    public readonly catalogId: string,
    public readonly hardwareItemId: string | null,
    public readonly sourceLocationId: string,
    public readonly isFromOtherPuesto: boolean,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly subtotal: number,
    public readonly createdAt: Date,
    public readonly catalogSku: string | null = null,
    public readonly catalogBrand: string | null = null,
    public readonly catalogModel: string | null = null,
    public readonly serialNumber: string | null = null,
    public readonly sourceLocationName: string | null = null,
  ) {}

  static create(props: {
    serviceOrderId: string;
    catalogId: string;
    hardwareItemId?: string | null;
    sourceLocationId: string;
    isFromOtherPuesto?: boolean;
    quantity?: number;
    unitPrice: number;
    catalogSku?: string | null;
    catalogBrand?: string | null;
    catalogModel?: string | null;
    serialNumber?: string | null;
    sourceLocationName?: string | null;
  }): ServiceItemEntity {
    const qty = props.quantity ?? 1;
    const subtotal = Number((props.unitPrice * qty).toFixed(2));
    const now = new Date();

    return new ServiceItemEntity(
      '',
      props.serviceOrderId,
      props.catalogId,
      props.hardwareItemId ?? null,
      props.sourceLocationId,
      props.isFromOtherPuesto ?? false,
      qty,
      props.unitPrice,
      subtotal,
      now,
      props.catalogSku ?? null,
      props.catalogBrand ?? null,
      props.catalogModel ?? null,
      props.serialNumber ?? null,
      props.sourceLocationName ?? null,
    );
  }
}
