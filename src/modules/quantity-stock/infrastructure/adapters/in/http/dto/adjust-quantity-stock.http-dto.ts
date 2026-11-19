import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';
import type { AdjustQuantityStockCommandDto } from '../../../../../application/dto/adjust-quantity-stock-command.dto';

export class AdjustQuantityStockHttpDto implements AdjustQuantityStockCommandDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del producto en ProductCatalog',
  })
  @IsUUID('4')
  @IsNotEmpty()
  catalogId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la ubicación del stock',
  })
  @IsUUID('4')
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    example: 18,
    description: 'Nueva cantidad física total tras el conteo o merma',
  })
  @IsInt()
  @Min(0)
  newQuantity: number;

  @ApiProperty({
    example: 'Conteo mensual físico en Puesto 102 - Se encontraron 2 unidades dañadas',
    description: 'Motivo obligatorio del ajuste de inventario',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
