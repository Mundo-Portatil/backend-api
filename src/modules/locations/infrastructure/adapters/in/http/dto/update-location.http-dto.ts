import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateLocationHttpDto {
  @ApiPropertyOptional({ example: 'Almacén Central Principal' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: false, description: 'Soft delete o reactivación' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
