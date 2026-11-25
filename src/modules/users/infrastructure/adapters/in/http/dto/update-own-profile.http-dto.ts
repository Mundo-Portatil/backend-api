import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateOwnProfileHttpDto {
  @ApiPropertyOptional({ example: 'nuevo.correo@mundoportatil.pe' })
  @IsOptional()
  @IsEmail({}, { message: 'Formato de correo inválido' })
  email?: string;

  @ApiPropertyOptional({ example: 'Carlos Mendoza Ramos' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'NuevaClaveSegura123!', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;
}
