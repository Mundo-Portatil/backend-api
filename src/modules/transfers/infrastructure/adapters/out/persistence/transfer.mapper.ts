import {
  InternalTransfer as PrismaInternalTransfer,
  InternalTransferItem as PrismaInternalTransferItem,
  ProductCatalog as PrismaCatalog,
  HardwareItem as PrismaHardwareItem,
  Location as PrismaLocation,
  User as PrismaUser,
} from '@prisma/client';
import { InternalTransferEntity, TransferStatusType, TransferTypeType } from '../../../../domain/entities/internal-transfer.entity';
import { InternalTransferItemEntity } from '../../../../domain/entities/internal-transfer-item.entity';

export type PrismaTransferItemWithRelations = PrismaInternalTransferItem & {
  catalog?: Pick<PrismaCatalog, 'sku' | 'brand' | 'model'> | null;
  hardwareItem?: Pick<PrismaHardwareItem, 'serialNumber'> | null;
};

export type PrismaTransferWithRelations = PrismaInternalTransfer & {
  fromLocation?: Pick<PrismaLocation, 'name'> | null;
  toLocation?: Pick<PrismaLocation, 'name'> | null;
  createdBy?: Pick<PrismaUser, 'name'> | null;
  items?: PrismaTransferItemWithRelations[];
};

export class TransferMapper {
  static toDomain(raw: PrismaTransferWithRelations): InternalTransferEntity {
    const items = (raw.items || []).map((item) =>
      new InternalTransferItemEntity(
        item.id,
        item.transferId,
        item.catalogId,
        item.hardwareItemId,
        item.quantity,
        item.hardwareItem?.serialNumber ?? null,
        item.catalog?.sku ?? null,
        item.catalog?.model ?? null,
        item.catalog?.brand ?? null,
      ),
    );

    return new InternalTransferEntity(
      raw.id,
      raw.code,
      raw.type as TransferTypeType,
      raw.status as TransferStatusType,
      raw.fromLocationId,
      raw.toLocationId,
      raw.createdById,
      raw.notes,
      raw.createdAt,
      raw.updatedAt,
      items,
      raw.fromLocation?.name ?? null,
      raw.toLocation?.name ?? null,
      raw.createdBy?.name ?? null,
    );
  }

  static toItemPersistenceCreate(item: InternalTransferItemEntity) {
    return {
      catalogId: item.catalogId,
      hardwareItemId: item.hardwareItemId,
      quantity: item.quantity,
    };
  }
}
