import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import type { InboundQuantityStockCommandDto } from '../../../../../application/dto/inbound-quantity-stock-command.dto';

export class InboundQuantityStockHttpDto implements InboundQuantityStockCommandDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del producto en ProductCatalog (no serializado o accesorio)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  catalogId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la ubicación de almacenamiento (Almacén o Puesto)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    example: '10bd5ae0-ad2f-449a-93e3-69bd3f012724',
    description: 'UUID de la empresa remitente/propietaria de la mercadería',
  })
  @IsUUID('4')
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    example: 25,
    description: 'Cantidad de unidades que ingresan',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 15.5, description: 'Costo unitario de reposición' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 35.0, description: 'Precio sugerido de venta al público' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;
}
