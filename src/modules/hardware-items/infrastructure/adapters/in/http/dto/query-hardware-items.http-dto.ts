import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ItemStatus } from '@prisma/client';
import type { ItemStatusType } from '../../../../../domain/entities/hardware-item.entity';

export class QueryHardwareItemsHttpDto {
  @ApiPropertyOptional({ description: 'Filtrar por UUID de ubicación' })
  @IsUUID('4')
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por UUID de categoría de producto' })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por UUID del ítem de catálogo' })
  @IsUUID('4')
  @IsOptional()
  catalogItemId?: string;

  @ApiPropertyOptional({ enum: ItemStatus, description: 'Filtrar por estado' })
  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatusType;

  @ApiPropertyOptional({
    enum: ['nuevo', 'usado'],
    description: 'Filtrar por condición (nuevo o segunda mano)',
  })
  @IsString()
  @IsOptional()
  condition?: 'nuevo' | 'usado';

  @ApiPropertyOptional({ description: 'Búsqueda por N/S, modelo o marca' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'true = Devuelve solo chasis principales/padres con sus componentes hijos incluidos',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  onlyParents?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50, description: 'Cantidad de ítems por página' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
