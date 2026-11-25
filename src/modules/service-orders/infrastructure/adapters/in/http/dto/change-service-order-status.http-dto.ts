import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServiceOrderStatus } from '@prisma/client';

export class ChangeServiceOrderStatusHttpDto {
  @ApiProperty({
    enum: ServiceOrderStatus,
    example: ServiceOrderStatus.EN_REPARACION,
    description: 'Nuevo estado de la orden (RECIBIDO, EN_REPARACION, LISTO, CANCELADO)',
  })
  @IsEnum(ServiceOrderStatus, { message: 'status debe ser un estado válido de ServiceOrderStatus' })
  @IsNotEmpty()
  status: ServiceOrderStatus;

  @ApiPropertyOptional({
    example: 'Cliente desistió de la reparación por costo de repuesto',
    description: 'Motivo obligatorio en caso de cancelación (status === CANCELADO)',
  })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
