export class QuantityStockEntity {
  constructor(
    public readonly id: string,
    public readonly catalogId: string,
    public readonly locationId: string,
    public readonly companyId: string,
    public readonly quantity: number,
    public readonly costPrice: number | null,
    public readonly salePrice: number | null,
    public readonly updatedAt: Date,
  ) {
    if (this.quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }
  }

  static create(props: {
    catalogId: string;
    locationId: string;
    companyId: string;
    quantity: number;
    costPrice?: number | null;
    salePrice?: number | null;
  }): QuantityStockEntity {
    if (props.quantity < 0) {
      throw new Error('Initial stock quantity cannot be negative');
    }

    return new QuantityStockEntity(
      '',
      props.catalogId,
      props.locationId,
      props.companyId,
      props.quantity,
      props.costPrice ?? null,
      props.salePrice ?? null,
      new Date(),
    );
  }

  increase(amount: number, newCostPrice?: number | null, newSalePrice?: number | null): QuantityStockEntity {
    if (amount <= 0) {
      throw new Error('Amount to increase must be greater than zero');
    }

    return new QuantityStockEntity(
      this.id,
      this.catalogId,
      this.locationId,
      this.companyId,
      this.quantity + amount,
      newCostPrice !== undefined ? newCostPrice : this.costPrice,
      newSalePrice !== undefined ? newSalePrice : this.salePrice,
      new Date(),
    );
  }

  decrease(amount: number): QuantityStockEntity {
    if (amount <= 0) {
      throw new Error('Amount to decrease must be greater than zero');
    }
    if (amount > this.quantity) {
      throw new Error(
        `Insufficient stock: current stock is ${this.quantity}, attempted to deduct ${amount}`,
      );
    }

    return new QuantityStockEntity(
      this.id,
      this.catalogId,
      this.locationId,
      this.companyId,
      this.quantity - amount,
      this.costPrice,
      this.salePrice,
      new Date(),
    );
  }

  adjust(newQuantity: number, reason: string): QuantityStockEntity {
    if (newQuantity < 0) {
      throw new Error('Adjusted stock quantity cannot be negative');
    }
    if (!reason || !reason.trim()) {
      throw new Error('A reason is mandatory for inventory adjustment');
    }

    return new QuantityStockEntity(
      this.id,
      this.catalogId,
      this.locationId,
      this.companyId,
      newQuantity,
      this.costPrice,
      this.salePrice,
      new Date(),
    );
  }
}
