import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import type { ValidateSerialsCommandDto } from '../../../../../application/dto/validate-serials-command.dto';

export class ValidateSerialsHttpDto implements ValidateSerialsCommandDto {
  @ApiProperty({
    example: ['NX-A515-SN88291', 'SN-RAM-8GB-0012'],
    description: 'Arreglo de números de serie para verificar existencia previa en la BD',
  })
  @IsArray()
  @IsString({ each: true })
  serialNumbers: string[];
}
