import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLocationHttpDto {
  @ApiProperty({ example: 'Puesto 102 - Mercadillo Bolognesi' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la ubicación es obligatorio' })
  name: string;

  @ApiPropertyOptional({ enum: LocationType, default: LocationType.PUESTO })
  @IsOptional()
  @IsEnum(LocationType, { message: 'El tipo debe ser ALMACEN_CENTRAL o PUESTO' })
  type?: LocationType;
}
