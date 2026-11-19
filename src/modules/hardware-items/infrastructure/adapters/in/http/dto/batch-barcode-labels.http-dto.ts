import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class BatchBarcodeLabelsHttpDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
    description: 'Arreglo de UUIDs de hardware para impresión masiva de etiquetas 1D',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  hardwareItemIds: string[];
}
