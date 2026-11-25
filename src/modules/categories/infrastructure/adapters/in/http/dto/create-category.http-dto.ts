import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { CreateCategoryCommandDto } from '../../../../../application/dto/create-category-command.dto';

export class CreateCategoryHttpDto implements CreateCategoryCommandDto {
  @ApiProperty({
    example: 'LAPTOP',
    description: 'Nombre único de la categoría (ej: LAPTOP, RAM, SSD, BATERIA)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Equipos portátiles para oficina y gaming',
    description: 'Descripción opcional de la categoría',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Estado inicial activo de la categoría',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
