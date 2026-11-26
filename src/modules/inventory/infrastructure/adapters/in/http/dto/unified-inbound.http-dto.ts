import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  UnifiedInboundCommandDto,
  UnifiedInboundItemCommandDto,
  UnifiedInboundSerialEntryCommandDto,
} from '../../../../../application/dto/unified-inbound-command.dto';

export class UnifiedInboundSerialEntryHttpDto implements UnifiedInboundSerialEntryCommandDto {
  @ApiProperty({
    example: 'SN-NXA515-001',
    description: 'Número de serie único de la unidad',
  })
  @IsString()
  @IsNotEmpty({ message: 'El número de serie es obligatorio' })
  serialNumber: string;

  @ApiPropertyOptional({
    example: 'Negro',
    description: 'Color o variante estética de esta unidad serializada',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    example: '10bd5ae0-ad2f-449a-93e3-69bd3f012724',
    description: 'UUID de la empresa propietaria/remitente de esta unidad',
  })
  @IsUUID('4')
  @IsNotEmpty({ message: 'El companyId es obligatorio para cada número de serie' })
  companyId: string;
}

export class UnifiedInboundItemHttpDto implements UnifiedInboundItemCommandDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del modelo maestro en catálogo',
  })
  @IsUUID('4')
  @IsNotEmpty()
  catalogId: string;

  @ApiProperty({
    example: 5,
    description: 'Cantidad de unidades que ingresan al Almacén Central',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: true,
    description: 'true = Requiere serialEntries obligatorios; false = Control cuantitativo (requiere companyId)',
  })
  @IsBoolean()
  hasSerialNumbers: boolean;

  @ApiPropertyOptional({
    example: '10bd5ae0-ad2f-449a-93e3-69bd3f012724',
    description: 'UUID de la empresa propietaria (obligatorio si hasSerialNumbers es false)',
  })
  @IsUUID('4')
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    type: [UnifiedInboundSerialEntryHttpDto],
    description: 'Arreglo de series con color y empresa si hasSerialNumbers es true',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnifiedInboundSerialEntryHttpDto)
  @IsOptional()
  serialEntries?: UnifiedInboundSerialEntryHttpDto[];

  @ApiPropertyOptional({
    example: ['SN-NXA515-001', 'SN-NXA515-002'],
    description: 'Compatibilidad transitoria: arreglo plano de series si no se usa serialEntries',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serialNumbers?: string[];

  @ApiPropertyOptional({
    example: 1800.0,
    description: 'Costo unitario de compra en PEN (opcional)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({
    example: 2450.0,
    description: 'Precio de venta al público en PEN (opcional, si se omite usa el del catálogo)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;
}

export class UnifiedInboundHttpDto implements UnifiedInboundCommandDto {
  @ApiProperty({
    type: [UnifiedInboundItemHttpDto],
    description: 'Lista de ítems/modelos que componen el ingreso al Almacén Central',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UnifiedInboundItemHttpDto)
  items: UnifiedInboundItemHttpDto[];

  @ApiPropertyOptional({
    example: 'Ingreso de importación lote Noviembre 2026',
    description: 'Notas o comentarios sobre el lote',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
