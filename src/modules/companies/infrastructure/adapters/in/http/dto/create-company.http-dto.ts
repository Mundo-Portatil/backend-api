import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import type { CreateCompanyCommandDto } from '../../../../../application/dto/create-company-command.dto';

export class CreateCompanyHttpDto implements CreateCompanyCommandDto {
  @ApiProperty({
    example: 'Importadora Tacna Tech S.A.C.',
    description: 'Razón social o nombre comercial de la empresa remitente/facturadora',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa no puede estar vacío' })
  name: string;

  @ApiProperty({
    example: '20601234567',
    description: 'RUC de 11 dígitos numéricos',
  })
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'El RUC debe tener exactamente 11 dígitos numéricos',
  })
  ruc: string;

  @ApiProperty({
    example: 'Av. Bolognesi 123, Tacna',
    description: 'Dirección fiscal de la empresa',
  })
  @IsString()
  @IsNotEmpty({ message: 'La dirección fiscal no puede estar vacía' })
  address: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo de la empresa (default: true)',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
