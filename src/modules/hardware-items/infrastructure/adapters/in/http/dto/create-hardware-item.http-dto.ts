import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ItemStatus } from '@prisma/client';
import type { CreateHardwareItemCommandDto } from '../../../../../application/dto/create-hardware-item-command.dto';
import type { ItemStatusType } from '../../../../../domain/entities/hardware-item.entity';

export class CreateHardwareItemHttpDto implements CreateHardwareItemCommandDto {
  @ApiPropertyOptional({
    example: 'NX-A515-SN88291',
    description: 'N/S único de fábrica (si se omite, se genera MP-YYYYMMDD-XXXXXX)',
  })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del modelo en ProductCatalog',
  })
  @IsUUID('4')
  @IsNotEmpty()
  catalogId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la ubicación física inicial',
  })
  @IsUUID('4')
  @IsNotEmpty()
  locationId: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del chasis laptop padre (si es un componente acoplado)',
  })
  @IsUUID('4')
  @IsOptional()
  parentChassisId?: string;

  @ApiPropertyOptional({ example: 150.0, description: 'Costo de adquisición' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 220.0, description: 'Precio de venta al público' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({
    enum: ItemStatus,
    default: ItemStatus.EN_STOCK,
    description: 'Estado inicial del ítem',
  })
  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatusType;
}
