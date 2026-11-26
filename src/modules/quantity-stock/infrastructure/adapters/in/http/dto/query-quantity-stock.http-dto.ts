import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class QueryQuantityStockHttpDto {
  @ApiPropertyOptional({ description: 'Filtrar por UUID de ubicación' })
  @IsUUID('4')
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por UUID de categoría' })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por UUID de ítem de catálogo' })
  @IsUUID('4')
  @IsOptional()
  catalogItemId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por UUID de la empresa remitente/facturadora' })
  @IsUUID('4')
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar productos con stock menor o igual a su umbral mínimo (alerta de stock bajo)',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  lowStock?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50, description: 'Cantidad de registros por página' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
