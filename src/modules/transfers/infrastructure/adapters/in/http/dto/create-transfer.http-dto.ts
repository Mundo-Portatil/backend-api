import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class TransferItemHttpDto {
  @ApiProperty({ example: '880e8400-e29b-41d4-a716-446655440000', description: 'ID del catálogo del producto' })
  @IsUUID('4', { message: 'catalogId debe ser un UUID válido' })
  @IsNotEmpty()
  catalogId: string;

  @ApiPropertyOptional({
    example: '110e8400-e29b-41d4-a716-446655440001',
    description: 'ID del ítem físico serializado (si es con número de serie único)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'hardwareItemId debe ser un UUID válido' })
  hardwareItemId?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Cantidad (para productos por cantidad)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class CreateTransferHttpDto {
  @ApiProperty({
    example: '9547ad29-dfdf-493b-a362-56e43835f9b3',
    description: 'ID del puesto origen',
  })
  @IsUUID('4', { message: 'fromLocationId debe ser un UUID válido' })
  @IsNotEmpty()
  fromLocationId: string;

  @ApiProperty({
    example: '7347ad29-dfdf-493b-a362-56e43835f9a1',
    description: 'ID del puesto destino',
  })
  @IsUUID('4', { message: 'toLocationId debe ser un UUID válido' })
  @IsNotEmpty()
  toLocationId: string;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'EN_TRANSITO'],
    default: 'DRAFT',
    description: 'Estado inicial: DRAFT (borrador sin mover stock) o EN_TRANSITO (despacho inmediato)',
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'EN_TRANSITO'], { message: 'status debe ser DRAFT o EN_TRANSITO' })
  status?: 'DRAFT' | 'EN_TRANSITO';

  @ApiPropertyOptional({
    example: 'Transferencia para apoyo de ventas en fin de semana',
    description: 'Notas u observaciones del traslado',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [TransferItemHttpDto],
    description: 'Lista de ítems incluidos en la transferencia',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemHttpDto)
  items: TransferItemHttpDto[];
}
