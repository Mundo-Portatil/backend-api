export interface CreatePassThroughCatalogModelCommandDto {
  tempModelName: string;
  brand?: string;
  categoryId: string;
  salePrice: number;
  serialNumber?: string;
  sourceVendor?: string;
}
