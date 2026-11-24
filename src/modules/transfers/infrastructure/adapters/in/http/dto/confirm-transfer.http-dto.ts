import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmTransferHttpDto {
  @ApiProperty({
    type: [String],
    example: ['MP-LP-ACER-000101', 'MP-LP-ACER-000102'],
    description: 'Lista obligatoria de números de serie escaneados por código de barras',
  })
  @IsArray({ message: 'scannedSerials debe ser una lista de series' })
  @IsString({ each: true, message: 'Cada serie debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'scannedSerials no puede estar vacío' })
  scannedSerials: string[];
}
