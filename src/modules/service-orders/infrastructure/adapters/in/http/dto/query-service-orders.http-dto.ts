import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ServiceOrderStatus } from '@prisma/client';

export class QueryServiceOrdersHttpDto {
  @ApiPropertyOptional({
    example: 'ed85bb8e-25e9-42d5-af3d-4b3f5d42e0b7',
    description: 'Filtrar por puesto (solo ADMIN; para TECNICO se fuerza automáticamente su propio puesto)',
  })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @ApiPropertyOptional({
    enum: ServiceOrderStatus,
    description:
      'Filtrar por estado (usar status=ENTREGADO para consultar Historial de Servicios Realizados)',
  })
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @ApiPropertyOptional({
    example: 'ThinkPad',
    description:
      'Búsqueda de texto parcial en código (OS-XXXXXX), cliente, documento, teléfono, marca, modelo o serie del equipo',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50, description: 'Límite de registros por página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
