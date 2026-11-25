export class BarcodeLabelValueObject {
  constructor(
    public readonly hardwareItemId: string,
    public readonly barcodeValue: string,
    public readonly title: string,
    public readonly specsSummary: string,
    public readonly locationName: string,
    public readonly price: number | null,
  ) {}

  static formatSpecs(props: {
    processor?: string | null;
    ramCapacity?: string | null;
    storageCapacity?: string | null;
    gpu?: string | null;
  }): string {
    const parts: string[] = [];
    if (props.processor) parts.push(props.processor);
    if (props.ramCapacity) parts.push(props.ramCapacity);
    if (props.storageCapacity) parts.push(props.storageCapacity);
    if (props.gpu) parts.push(props.gpu);
    return parts.join(' | ') || 'N/A';
  }
}
