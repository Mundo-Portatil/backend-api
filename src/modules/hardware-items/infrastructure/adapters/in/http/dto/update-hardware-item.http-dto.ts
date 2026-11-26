import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ItemStatus } from '@prisma/client';
import type { UpdateHardwareItemCommandDto } from '../../../../../application/use-cases/update-hardware-item.use-case';
import type { ItemStatusType } from '../../../../../domain/entities/hardware-item.entity';

export class UpdateHardwareItemHttpDto implements UpdateHardwareItemCommandDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Nueva ubicación física' })
  @IsUUID('4')
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({ example: 'Plata', description: 'Color o variante estética' })
  @IsString()
  @IsOptional()
  color?: string | null;

  @ApiPropertyOptional({ example: 160.0, description: 'Costo actualizado' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 240.0, description: 'Precio de venta al público' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ enum: ItemStatus, description: 'Nuevo estado operativo' })
  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatusType;
}
