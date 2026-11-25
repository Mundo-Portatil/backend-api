import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryCatalogHttpDto {
  @ApiPropertyOptional({ description: 'Filtrar por UUID de categoría' })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo/inactivo' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Búsqueda por SKU, nombre, marca o modelo' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 50, description: 'Cantidad de registros por página' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
