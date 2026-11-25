import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CustomerDocumentType } from '@prisma/client';

export class CreateServiceOrderHttpDto {
  @ApiPropertyOptional({
    example: 'ed85bb8e-25e9-42d5-af3d-4b3f5d42e0b7',
    description:
      'ID del puesto donde se realiza la atención (obligatorio si el usuario es ADMIN; si es TECNICO se ignora o debe coincidir)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'locationId debe ser un UUID válido' })
  locationId?: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo del cliente' })
  @IsString()
  @IsNotEmpty({ message: 'customerName no puede estar vacío' })
  customerName: string;

  @ApiPropertyOptional({
    enum: CustomerDocumentType,
    default: CustomerDocumentType.SIN_DOCUMENTO,
    description: 'Tipo de documento de identidad del cliente',
  })
  @IsOptional()
  @IsEnum(CustomerDocumentType, { message: 'customerDocumentType debe ser SIN_DOCUMENTO, DNI, RUC o CE' })
  customerDocumentType?: CustomerDocumentType;

  @ApiPropertyOptional({ example: '72345678', description: 'Número de documento del cliente' })
  @IsOptional()
  @IsString()
  customerDocument?: string;

  @ApiPropertyOptional({ example: '987654321', description: 'Teléfono de contacto del cliente' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'Av. Wilson 1234, Lima', description: 'Dirección del cliente' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiProperty({ example: 'Lenovo', description: 'Marca del equipo' })
  @IsString()
  @IsNotEmpty({ message: 'deviceBrand no puede estar vacío' })
  deviceBrand: string;

  @ApiProperty({ example: 'ThinkPad T480', description: 'Modelo del equipo' })
  @IsString()
  @IsNotEmpty({ message: 'deviceModel no puede estar vacío' })
  deviceModel: string;

  @ApiPropertyOptional({ example: 'PF123456', description: 'Número de serie del equipo' })
  @IsOptional()
  @IsString()
  deviceSerial?: string;

  @ApiPropertyOptional({ example: 'Cargador original, funda', description: 'Accesorios dejados con el equipo' })
  @IsOptional()
  @IsString()
  deviceAccessories?: string;

  @ApiProperty({ example: 'No enciende tras corte de energía', description: 'Problema reportado por el cliente' })
  @IsString()
  @IsNotEmpty({ message: 'reportedIssue no puede estar vacío' })
  reportedIssue: string;

  @ApiPropertyOptional({ example: 'Revisión preliminar de placa', description: 'Notas técnicas del diagnóstico' })
  @IsOptional()
  @IsString()
  technicalNotes?: string;

  @ApiPropertyOptional({ example: 'Se retira memoria RAM dañada', description: 'Piezas extraídas o cambiadas' })
  @IsOptional()
  @IsString()
  extractedPartsNotes?: string;

  @ApiPropertyOptional({ example: 80.0, description: 'Costo de mano de obra inicial' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'laborCost debe ser un número' })
  @Min(0, { message: 'laborCost no puede ser negativo' })
  laborCost?: number;
}
