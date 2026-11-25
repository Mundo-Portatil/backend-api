export type PaymentMethodType =
  | 'EFECTIVO'
  | 'YAPE'
  | 'PLIN'
  | 'TARJETA'
  | 'TRANSFERENCIA';

export class ServiceOrderPaymentEntity {
  constructor(
    public readonly id: string,
    public readonly serviceOrderId: string,
    public readonly method: PaymentMethodType,
    public readonly amount: number,
    public readonly reference: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    serviceOrderId: string;
    method: PaymentMethodType;
    amount: number;
    reference?: string | null;
  }): ServiceOrderPaymentEntity {
    return new ServiceOrderPaymentEntity(
      '',
      props.serviceOrderId,
      props.method,
      Number(props.amount.toFixed(2)),
      props.reference ?? null,
      new Date(),
    );
  }
}
