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
} from '../../../../../application/dto/unified-inbound-command.dto';

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
    description: 'true = Requiere números de serie obligatorios; false = Control cuantitativo',
  })
  @IsBoolean()
  hasSerialNumbers: boolean;

  @ApiPropertyOptional({
    example: ['SN-NXA515-001', 'SN-NXA515-002', 'SN-NXA515-003', 'SN-NXA515-004', 'SN-NXA515-005'],
    description: 'Arreglo de números de serie obligatorios si hasSerialNumbers es true',
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
