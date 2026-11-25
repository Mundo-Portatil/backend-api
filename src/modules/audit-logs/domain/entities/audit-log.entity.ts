export class AuditLogEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string | null,
    public readonly action: string,
    public readonly module: string,
    public readonly payload: unknown,
    public readonly ipAddress: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    userId?: string | null;
    action: string;
    module: string;
    payload?: unknown;
    ipAddress?: string | null;
  }): AuditLogEntity {
    return new AuditLogEntity(
      '',
      props.userId ?? null,
      props.action,
      props.module,
      props.payload ?? null,
      props.ipAddress ?? null,
      new Date(),
    );
  }
}
