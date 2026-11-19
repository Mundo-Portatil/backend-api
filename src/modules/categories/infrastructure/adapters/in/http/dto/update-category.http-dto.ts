import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import type { UpdateCategoryCommandDto } from '../../../../../application/dto/update-category-command.dto';

export class UpdateCategoryHttpDto implements UpdateCategoryCommandDto {
  @ApiPropertyOptional({
    example: 'LAPTOP GAMING',
    description: 'Nuevo nombre de la categoría',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Laptops de alto rendimiento',
    description: 'Nueva descripción de la categoría',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo (Soft delete cuando es false)',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
