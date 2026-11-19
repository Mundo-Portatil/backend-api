export class CatalogItemEntity {
  constructor(
    public readonly id: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly brand: string,
    public readonly model: string,
    public readonly categoryId: string,
    public readonly processor: string | null,
    public readonly ramCapacity: string | null,
    public readonly storageCapacity: string | null,
    public readonly gpu: string | null,
    public readonly screenSize: string | null,
    public readonly isSerialized: boolean,
    public readonly minStockThreshold: number,
    public readonly basePrice: number,
    public readonly isSecondHand: boolean,
    public readonly active: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    sku: string;
    name: string;
    brand: string;
    model: string;
    categoryId: string;
    processor?: string;
    ramCapacity?: string;
    storageCapacity?: string;
    gpu?: string;
    screenSize?: string;
    isSerialized?: boolean;
    minStockThreshold?: number;
    basePrice: number;
    isSecondHand?: boolean;
    active?: boolean;
  }): CatalogItemEntity {
    const sku = props.sku.trim().toUpperCase();
    if (!sku) {
      throw new Error('SKU cannot be empty');
    }
    if (props.basePrice < 0) {
      throw new Error('Base price cannot be negative');
    }
    if (props.minStockThreshold !== undefined && props.minStockThreshold < 0) {
      throw new Error('Minimum stock threshold cannot be negative');
    }

    return new CatalogItemEntity(
      '',
      sku,
      props.name.trim(),
      props.brand.trim(),
      props.model.trim(),
      props.categoryId,
      props.processor?.trim() ?? null,
      props.ramCapacity?.trim() ?? null,
      props.storageCapacity?.trim() ?? null,
      props.gpu?.trim() ?? null,
      props.screenSize?.trim() ?? null,
      props.isSerialized ?? true,
      props.minStockThreshold ?? 2,
      props.basePrice,
      props.isSecondHand ?? false,
      props.active ?? true,
      new Date(),
    );
  }

  deactivate(): CatalogItemEntity {
    return new CatalogItemEntity(
      this.id,
      this.sku,
      this.name,
      this.brand,
      this.model,
      this.categoryId,
      this.processor,
      this.ramCapacity,
      this.storageCapacity,
      this.gpu,
      this.screenSize,
      this.isSerialized,
      this.minStockThreshold,
      this.basePrice,
      this.isSecondHand,
      false,
      this.createdAt,
    );
  }

  updateDetails(props: {
    name?: string;
    brand?: string;
    model?: string;
    categoryId?: string;
    processor?: string;
    ramCapacity?: string;
    storageCapacity?: string;
    gpu?: string;
    screenSize?: string;
    isSerialized?: boolean;
    minStockThreshold?: number;
    basePrice?: number;
    isSecondHand?: boolean;
    active?: boolean;
  }): CatalogItemEntity {
    return new CatalogItemEntity(
      this.id,
      this.sku,
      props.name !== undefined ? props.name.trim() : this.name,
      props.brand !== undefined ? props.brand.trim() : this.brand,
      props.model !== undefined ? props.model.trim() : this.model,
      props.categoryId !== undefined ? props.categoryId : this.categoryId,
      props.processor !== undefined ? props.processor?.trim() || null : this.processor,
      props.ramCapacity !== undefined ? props.ramCapacity?.trim() || null : this.ramCapacity,
      props.storageCapacity !== undefined ? props.storageCapacity?.trim() || null : this.storageCapacity,
      props.gpu !== undefined ? props.gpu?.trim() || null : this.gpu,
      props.screenSize !== undefined ? props.screenSize?.trim() || null : this.screenSize,
      props.isSerialized !== undefined ? props.isSerialized : this.isSerialized,
      props.minStockThreshold !== undefined ? props.minStockThreshold : this.minStockThreshold,
      props.basePrice !== undefined ? props.basePrice : this.basePrice,
      props.isSecondHand !== undefined ? props.isSecondHand : this.isSecondHand,
      props.active !== undefined ? props.active : this.active,
      this.createdAt,
    );
  }
}
