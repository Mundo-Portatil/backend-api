import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserHttpDto {
  @ApiProperty({ example: 'empleado@mundoportatil.pe' })
  @IsEmail({}, { message: 'Formato de correo inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ example: 'Segura123!', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.VENDEDOR })
  @IsOptional()
  @IsEnum(Role, { message: 'El rol debe ser ADMIN, VENDEDOR o TECNICO' })
  role?: Role;
}
