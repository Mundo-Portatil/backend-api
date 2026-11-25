import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsEnum(Role, { message: 'El rol debe ser ADMIN, ENCARGADO_ALMACEN, VENDEDOR o TECNICO' })
  role?: Role;

  @ApiPropertyOptional({
    description: 'ID de la ubicación física asignada (obligatorio para VENDEDOR y TECNICO)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'locationId debe ser un UUID válido' })
  locationId?: string | null;
}
