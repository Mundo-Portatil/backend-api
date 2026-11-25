import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CustomerDocumentType, PaymentMethod, ReceiptType } from '@prisma/client';

export class ServicePaymentItemHttpDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.EFECTIVO,
    description: 'Medio de pago utilizado (EFECTIVO, YAPE, PLIN, TARJETA, TRANSFERENCIA)',
  })
  @IsEnum(PaymentMethod, { message: 'method debe ser EFECTIVO, YAPE, PLIN, TARJETA o TRANSFERENCIA' })
  @IsNotEmpty()
  method: PaymentMethod;

  @ApiProperty({ example: 100.0, description: 'Monto pagado con este medio' })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount debe ser un número' })
  @Min(0.01, { message: 'amount debe ser mayor a 0' })
  amount: number;

  @ApiPropertyOptional({ example: 'Operación 123456', description: 'Número de referencia o voucher' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class ServiceReceiptDataHttpDto {
  @ApiPropertyOptional({
    enum: ReceiptType,
    default: ReceiptType.BOLETA_INTERNA,
    description: 'Tipo de comprobante emitido (BOLETA_INTERNA, BOLETA, FACTURA)',
  })
  @IsOptional()
  @IsEnum(ReceiptType)
  receiptType?: ReceiptType;

  @ApiPropertyOptional({ example: 'Juan Pérez Gómez', description: 'Razón social o nombre para el comprobante' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    enum: CustomerDocumentType,
    description: 'Tipo de documento de identidad del cliente (SIN_DOCUMENTO, DNI, RUC, CE)',
  })
  @IsOptional()
  @IsEnum(CustomerDocumentType)
  customerDocumentType?: CustomerDocumentType;

  @ApiPropertyOptional({ example: '72345678', description: 'Número de documento para el comprobante' })
  @IsOptional()
  @IsString()
  customerDocument?: string;

  @ApiPropertyOptional({ example: 'Av. Wilson 1234, Lima', description: 'Dirección para el comprobante' })
  @IsOptional()
  @IsString()
  customerAddress?: string;
}

export class DeliverServiceOrderHttpDto {
  @ApiProperty({
    type: [ServicePaymentItemHttpDto],
    description: 'Lista de pagos realizados (la suma debe coincidir exactamente con el totalAmount de la orden)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePaymentItemHttpDto)
  payments: ServicePaymentItemHttpDto[];

  @ApiPropertyOptional({
    type: ServiceReceiptDataHttpDto,
    description: 'Datos fiscales o personalizados para el comprobante emitido',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceReceiptDataHttpDto)
  receipt?: ServiceReceiptDataHttpDto;
}
