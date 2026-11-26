import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import type { ApproveUsedComponentCommandDto } from '../../../../../application/dto/approve-used-component-command.dto';

export class ApproveUsedComponentHttpDto implements ApproveUsedComponentCommandDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del hardware ítem extraído (en SEGUNDA_MANO_PENDIENTE)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la ubicación física donde se almacenará el componente usado',
  })
  @IsUUID('4')
  @IsNotEmpty()
  locationId: string;

  @ApiPropertyOptional({
    example: '10bd5ae0-ad2f-449a-93e3-69bd3f012724',
    description: 'UUID de la empresa asignada (si se omite, hereda la empresa original del ítem)',
  })
  @IsUUID('4')
  @IsOptional()
  companyId?: string;

  @ApiProperty({
    example: 95.0,
    description: 'Precio de venta al público como componente de segunda mano',
  })
  @IsNumber()
  @Min(0.01)
  salePrice: number;
}
