import type { TransferResponseDto, TransferItemResponseDto } from './transfer-response.dto';

export interface TransferDetailResponseDto extends TransferResponseDto {
  items: TransferItemResponseDto[];
}
