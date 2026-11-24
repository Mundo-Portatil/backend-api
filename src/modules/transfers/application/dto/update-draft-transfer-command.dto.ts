import type { CreateTransferItemCommandDto } from './create-transfer-command.dto';

export interface UpdateDraftTransferCommandDto {
  toLocationId?: string;
  notes?: string;
  items?: CreateTransferItemCommandDto[];
}
