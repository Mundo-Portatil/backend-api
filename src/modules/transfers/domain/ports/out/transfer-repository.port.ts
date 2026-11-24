import { InternalTransferEntity } from '../../entities/internal-transfer.entity';

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');

export interface TransferFilterOptions {
  fromLocationId?: string;
  toLocationId?: string;
  locationId?: string; // fromLocationId OR toLocationId
  startDate?: Date;
  endDate?: Date;
}

export interface TransferRepositoryPort {
  create(transfer: InternalTransferEntity, tx?: unknown): Promise<InternalTransferEntity>;
  findById(id: string, tx?: unknown): Promise<InternalTransferEntity | null>;
  findByCode(code: string, tx?: unknown): Promise<InternalTransferEntity | null>;
  findAll(filter?: TransferFilterOptions): Promise<InternalTransferEntity[]>;
}
