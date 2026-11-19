import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type { CreateCatalogItemCommandDto } from '../../../../../application/dto/create-catalog-item-command.dto';

export class CreateCatalogItemHttpDto implements CreateCatalogItemCommandDto {
  @ApiProperty({
    example: 'NB-ACER-A515-56-001',
    description: 'Código SKU o modelo interno único',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    example: 'Acer Aspire 5 15.6" i5',
    description: 'Nombre comercial del producto',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Acer', description: 'Marca del fabricante' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'A515-56', description: 'Modelo específico' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la categoría asociada',
  })
  @IsUUID('4')
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ example: 'Intel Core i5-1135G7', description: 'Procesador' })
  @IsString()
  @IsOptional()
  processor?: string;

  @ApiPropertyOptional({ example: '16GB DDR4', description: 'Capacidad de memoria RAM' })
  @IsString()
  @IsOptional()
  ramCapacity?: string;

  @ApiPropertyOptional({ example: '512GB NVMe SSD', description: 'Almacenamiento' })
  @IsString()
  @IsOptional()
  storageCapacity?: string;

  @ApiPropertyOptional({ example: 'Intel Iris Xe', description: 'Tarjeta gráfica (GPU)' })
  @IsString()
  @IsOptional()
  gpu?: string;

  @ApiPropertyOptional({ example: '15.6" FHD IPS', description: 'Tamaño y tipo de pantalla' })
  @IsString()
  @IsOptional()
  screenSize?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'true = Con N/S individual; false = Control Cuantitativo',
  })
  @IsBoolean()
  @IsOptional()
  isSerialized?: boolean;

  @ApiPropertyOptional({
    example: 2,
    default: 2,
    description: 'Umbral mínimo de stock para alertas',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockThreshold?: number;

  @ApiProperty({
    example: 2350.0,
    description: 'Precio base referencial de venta en PEN',
  })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'true = Es producto de segunda mano',
  })
  @IsBoolean()
  @IsOptional()
  isSecondHand?: boolean;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Estado activo/inactivo',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
