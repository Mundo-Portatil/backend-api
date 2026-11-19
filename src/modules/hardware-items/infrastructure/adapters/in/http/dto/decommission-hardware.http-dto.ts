import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import type { DecommissionHardwareCommandDto } from '../../../../../application/dto/decommission-hardware-command.dto';

export class DecommissionHardwareHttpDto implements DecommissionHardwareCommandDto {
  @ApiProperty({
    example: 'Error de ingreso en lote o daño irreparable en placa base',
    description: 'Motivo obligatorio de la baja lógica del hardware',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
