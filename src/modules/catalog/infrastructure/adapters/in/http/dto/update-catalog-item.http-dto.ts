import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type { UpdateCatalogItemCommandDto } from '../../../../../application/dto/update-catalog-item-command.dto';

export class UpdateCatalogItemHttpDto implements UpdateCatalogItemCommandDto {
  @ApiPropertyOptional({ example: 'Acer', description: 'Marca' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 'A515-56-V2', description: 'Modelo' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID categoría' })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Intel Core i5-1135G7', description: 'Procesador' })
  @IsString()
  @IsOptional()
  processor?: string;

  @ApiPropertyOptional({ example: '32GB DDR4', description: 'RAM' })
  @IsString()
  @IsOptional()
  ramCapacity?: string;

  @ApiPropertyOptional({ example: '1TB NVMe SSD', description: 'Almacenamiento' })
  @IsString()
  @IsOptional()
  storageCapacity?: string;

  @ApiPropertyOptional({ example: 'Intel Iris Xe', description: 'GPU' })
  @IsString()
  @IsOptional()
  gpu?: string;

  @ApiPropertyOptional({ example: '15.6" FHD IPS', description: 'Pantalla' })
  @IsString()
  @IsOptional()
  screenSize?: string;

  @ApiPropertyOptional({ example: true, description: 'Es serializado' })
  @IsBoolean()
  @IsOptional()
  isSerialized?: boolean;

  @ApiPropertyOptional({ example: 3, description: 'Umbral mínimo de stock' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockThreshold?: number;

  @ApiPropertyOptional({ example: 2500.0, description: 'Precio base referencial' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: false, description: 'Es de segunda mano' })
  @IsBoolean()
  @IsOptional()
  isSecondHand?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Estado activo (Soft delete si es false)' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
