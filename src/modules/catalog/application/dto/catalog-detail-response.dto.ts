import type { CatalogItemResponseDto } from './catalog-item-response.dto';
import type { LocationStockDetail } from '../../domain/ports/out/catalog-repository.port';

export interface CatalogDetailResponseDto {
  item: CatalogItemResponseDto;
  categoryName: string;
  stockSummary: LocationStockDetail[];
  totalStockOverall: number;
}
