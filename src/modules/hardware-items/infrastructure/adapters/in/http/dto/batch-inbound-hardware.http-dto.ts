import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  BatchInboundHardwareCommandDto,
  InboundComponentDto,
  InboundItemWithChildrenDto,
} from '../../../../../application/dto/batch-inbound-hardware-command.dto';

export class InboundComponentHttpDto implements InboundComponentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del modelo de catálogo (RAM, SSD, etc.)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  catalogId: string;

  @ApiPropertyOptional({
    example: 'SN-RAM-8GB-0012',
    description: 'N/S único de fábrica (si se omite, se autogenera MP-...)',
  })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ example: 120.0, description: 'Costo unitario de compra' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 180.0, description: 'Precio sugerido de venta' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;
}

export class InboundItemWithChildrenHttpDto implements InboundItemWithChildrenDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del producto maestro de catálogo (Chasis laptop o ítem suelto)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  catalogId: string;

  @ApiPropertyOptional({
    example: 'SN-LAPTOP-ACER-9988',
    description: 'N/S de fábrica (si se omite, se autogenera MP-...)',
  })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ example: 2100.0, description: 'Costo de compra' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 2600.0, description: 'Precio sugerido de venta' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({
    type: [InboundComponentHttpDto],
    description: 'Componentes internos instalados en este chasis (RAM, SSD, batería, cargador)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InboundComponentHttpDto)
  @IsOptional()
  children?: InboundComponentHttpDto[];
}

export class BatchInboundHardwareHttpDto implements BatchInboundHardwareCommandDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la ubicación de destino inicial (ej: Almacén Central)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    type: [InboundItemWithChildrenHttpDto],
    description: 'Arreglo de laptops/equipos con componentes anidados e ítems individuales',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InboundItemWithChildrenHttpDto)
  items: InboundItemWithChildrenHttpDto[];
}
