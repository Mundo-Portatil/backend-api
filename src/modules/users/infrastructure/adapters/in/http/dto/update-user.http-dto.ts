import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UpdateUserHttpDto {
  @ApiPropertyOptional({ example: 'Juan Carlos Pérez' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'El rol debe ser ADMIN, ENCARGADO_ALMACEN, VENDEDOR o TECNICO' })
  role?: Role;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'NuevaClave123!', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiPropertyOptional({
    description: 'ID de la ubicación física asignada',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'locationId debe ser un UUID válido' })
  locationId?: string | null;
}
