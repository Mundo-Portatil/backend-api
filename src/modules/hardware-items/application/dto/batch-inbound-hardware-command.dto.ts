export interface InboundComponentDto {
  catalogId: string;
  serialNumber?: string;
  costPrice?: number;
  salePrice?: number;
}

export interface InboundItemWithChildrenDto {
  catalogId: string;
  serialNumber?: string;
  costPrice?: number;
  salePrice?: number;
  children?: InboundComponentDto[];
}

export interface BatchInboundHardwareCommandDto {
  locationId: string;
  items: InboundItemWithChildrenDto[];
}
