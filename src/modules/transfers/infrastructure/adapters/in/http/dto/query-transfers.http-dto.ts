import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryTransfersHttpDto {
  @ApiPropertyOptional({
    enum: ['DRAFT', 'EN_TRANSITO', 'COMPLETED', 'CANCELLED'],
    description: 'Filtrar por estado del traslado',
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'EN_TRANSITO', 'COMPLETED', 'CANCELLED'])
  status?: 'DRAFT' | 'EN_TRANSITO' | 'COMPLETED' | 'CANCELLED';

  @ApiPropertyOptional({
    enum: ['DIRECTO', 'ENTRE_PUESTOS'],
    description: 'Filtrar por tipo de traslado',
  })
  @IsOptional()
  @IsEnum(['DIRECTO', 'ENTRE_PUESTOS'])
  type?: 'DIRECTO' | 'ENTRE_PUESTOS';

  @ApiPropertyOptional({
    example: 'ed85bb8e-25e9-42d5-af3d-4b3f5d42e0b7',
    description: 'Filtrar por puesto/ubicación de origen',
  })
  @IsOptional()
  @IsUUID('4')
  fromLocationId?: string;

  @ApiPropertyOptional({
    example: '9547ad29-dfdf-493b-a362-56e43835f9b3',
    description: 'Filtrar por puesto/ubicación de destino',
  })
  @IsOptional()
  @IsUUID('4')
  toLocationId?: string;

  @ApiPropertyOptional({
    example: '9547ad29-dfdf-493b-a362-56e43835f9b3',
    description: 'Filtrar por ubicación (sea origen o destino)',
  })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Fecha inicial de creación (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Fecha final de creación (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
