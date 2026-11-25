import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CustomerDocumentType } from '@prisma/client';

export class UpdateServiceOrderHttpDto {
  @ApiPropertyOptional({ example: 'Juan Pérez Gómez', description: 'Nombre completo del cliente' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    enum: CustomerDocumentType,
    description: 'Tipo de documento de identidad del cliente',
  })
  @IsOptional()
  @IsEnum(CustomerDocumentType)
  customerDocumentType?: CustomerDocumentType;

  @ApiPropertyOptional({ example: '72345678', description: 'Número de documento del cliente' })
  @IsOptional()
  @IsString()
  customerDocument?: string;

  @ApiPropertyOptional({ example: '987654321', description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'Av. Wilson 1234, Lima', description: 'Dirección del cliente' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ example: 'PF123456', description: 'Serie del equipo' })
  @IsOptional()
  @IsString()
  deviceSerial?: string;

  @ApiPropertyOptional({ example: 'Cargador original', description: 'Accesorios dejados' })
  @IsOptional()
  @IsString()
  deviceAccessories?: string;

  @ApiPropertyOptional({ example: 'No enciende y calienta', description: 'Problema reportado' })
  @IsOptional()
  @IsString()
  reportedIssue?: string;

  @ApiPropertyOptional({
    example: 'Se reemplazó condensador en etapa de poder',
    description: 'Notas técnicas del diagnóstico',
  })
  @IsOptional()
  @IsString()
  technicalNotes?: string;

  @ApiPropertyOptional({
    example: 'Condensador quemado entregado a cliente',
    description: 'Piezas extraídas',
  })
  @IsOptional()
  @IsString()
  extractedPartsNotes?: string;

  @ApiPropertyOptional({ example: 100.0, description: 'Costo actualizado de mano de obra' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'laborCost debe ser un número' })
  @Min(0, { message: 'laborCost no puede ser negativo' })
  laborCost?: number;
}
