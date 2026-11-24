import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class DirectTransferQuantityItemHttpDto {
  @ApiProperty({ example: '880e8400-e29b-41d4-a716-446655440000', description: 'ID del catálogo' })
  @IsUUID('4', { message: 'catalogId debe ser un UUID válido' })
  @IsNotEmpty()
  catalogId: string;

  @ApiProperty({ example: 10, description: 'Cantidad física a trasladar' })
  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(1, { message: 'quantity debe ser al menos 1' })
  quantity: number;
}

export class CreateDirectTransferHttpDto {
  @ApiProperty({
    example: 'ed85bb8e-25e9-42d5-af3d-4b3f5d42e0b7',
    description: 'ID de la ubicación de origen (Almacén Central o Puesto)',
  })
  @IsUUID('4', { message: 'fromLocationId debe ser un UUID válido' })
  @IsNotEmpty()
  fromLocationId: string;

  @ApiProperty({
    example: '9547ad29-dfdf-493b-a362-56e43835f9b3',
    description: 'ID de la ubicación de destino (Almacén Central o Puesto)',
  })
  @IsUUID('4', { message: 'toLocationId debe ser un UUID válido' })
  @IsNotEmpty()
  toLocationId: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['110e8400-e29b-41d4-a716-446655440001', '110e8400-e29b-41d4-a716-446655440002'],
    description: 'Lista de IDs de ítems de hardware serializados a trasladar',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada ID en hardwareItemIds debe ser un UUID válido' })
  hardwareItemIds?: string[];

  @ApiPropertyOptional({
    type: [DirectTransferQuantityItemHttpDto],
    description: 'Lista de productos cuantitativos a trasladar',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectTransferQuantityItemHttpDto)
  quantities?: DirectTransferQuantityItemHttpDto[];

  @ApiPropertyOptional({
    example: 'Abastecimiento matutino de laptops y periféricos',
    description: 'Notas u observaciones del traslado directo',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
