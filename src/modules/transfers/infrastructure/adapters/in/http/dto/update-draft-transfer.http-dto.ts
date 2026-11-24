import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { TransferItemHttpDto } from './create-transfer.http-dto';

export class UpdateDraftTransferHttpDto {
  @ApiPropertyOptional({
    example: '7347ad29-dfdf-493b-a362-56e43835f9a1',
    description: 'Nuevo ID del puesto destino',
  })
  @IsOptional()
  @IsUUID('4', { message: 'toLocationId debe ser un UUID válido' })
  toLocationId?: string;

  @ApiPropertyOptional({
    example: 'Modificación de notas del traslado',
    description: 'Notas actualizadas',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: [TransferItemHttpDto],
    description: 'Lista completa de ítems para reemplazar en el borrador',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemHttpDto)
  items?: TransferItemHttpDto[];
}
