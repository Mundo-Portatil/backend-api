import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { PrintModelBarcodeLabelsCommandDto } from '../../../../../application/dto/print-model-barcode-labels-command.dto';

export class PrintModelBarcodeLabelsHttpDto implements PrintModelBarcodeLabelsCommandDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del modelo maestro en catálogo a imprimir',
  })
  @IsUUID('4')
  @IsNotEmpty()
  catalogId: string;

  @ApiProperty({
    example: 10,
    description: 'Número de etiquetas a generar/imprimir (1 a 100)',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  copies: number;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174999',
    description: 'UUID de la ubicación (opcional, por defecto Almacén Central)',
  })
  @IsUUID('4')
  @IsOptional()
  locationId?: string;
}
