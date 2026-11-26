import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import type { UpdateCompanyCommandDto } from '../../../../../application/dto/update-company-command.dto';

export class UpdateCompanyHttpDto implements UpdateCompanyCommandDto {
  @ApiPropertyOptional({
    example: 'Importadora Tacna Tech S.A.C.',
    description: 'Razón social o nombre comercial',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: '20601234567',
    description: 'RUC de 11 dígitos numéricos',
  })
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'El RUC debe tener exactamente 11 dígitos numéricos',
  })
  @IsOptional()
  ruc?: string;

  @ApiPropertyOptional({
    example: 'Av. Bolognesi 456, Tacna',
    description: 'Dirección fiscal de la empresa',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Desactivar o activar la empresa (soft delete)',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
