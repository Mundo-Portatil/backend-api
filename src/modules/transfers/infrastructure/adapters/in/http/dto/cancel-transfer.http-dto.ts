import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelTransferHttpDto {
  @ApiPropertyOptional({
    example: 'Transferencia cancelada por error de selección de puesto destino',
    description: 'Motivo explicativo de la cancelación',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
