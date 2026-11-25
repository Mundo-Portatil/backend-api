import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class AddServiceItemHttpDto {
  @ApiProperty({
    example: '880e8400-e29b-41d4-a716-446655440000',
    description: 'ID del producto en catálogo',
  })
  @IsUUID('4', { message: 'catalogId debe ser un UUID válido' })
  @IsNotEmpty()
  catalogId: string;

  @ApiPropertyOptional({
    example: '110e8400-e29b-41d4-a716-446655440001',
    description: 'ID del ítem de hardware serializado específico a consumir como repuesto',
  })
  @IsOptional()
  @IsUUID('4', { message: 'hardwareItemId debe ser un UUID válido' })
  hardwareItemId?: string;

  @ApiPropertyOptional({
    example: 'ed85bb8e-25e9-42d5-af3d-4b3f5d42e0b7',
    description:
      'ID del puesto desde el cual se extrae el repuesto (si se omite, se usa el puesto de la orden; si es distinto marca isFromOtherPuesto=true)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'sourceLocationId debe ser un UUID válido' })
  sourceLocationId?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description:
      'Cantidad a consumir (para repuestos cuantitativos sin número de serie; para serializados se fuerza a 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(1, { message: 'quantity debe ser al menos 1' })
  quantity?: number;

  @ApiProperty({ example: 120.0, description: 'Precio unitario cobrado al cliente por este repuesto' })
  @Type(() => Number)
  @IsNumber({}, { message: 'unitPrice debe ser un número' })
  @Min(0, { message: 'unitPrice no puede ser negativo' })
  unitPrice: number;
}
