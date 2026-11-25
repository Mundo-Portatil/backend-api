import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderRepositoryPort } from '../../domain/ports/out/service-order-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { UpdateServiceOrderCommandDto } from '../dto/update-service-order-command.dto';
import type { ServiceOrderDetailResponseDto } from '../dto/service-order-detail-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class UpdateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    idOrCode: string,
    dto: UpdateServiceOrderCommandDto,
    user: { id: string; role: string; locationId?: string | null },
    ipAddress?: string,
  ): Promise<ServiceOrderDetailResponseDto> {
    const order =
      (await this.serviceOrderRepository.findById(idOrCode)) ??
      (await this.serviceOrderRepository.findByCode(idOrCode));

    if (!order) {
      throw new NotFoundException('Orden de servicio técnico no encontrada');
    }

    if (user.role === 'TECNICO' && user.locationId !== order.locationId) {
      throw new ForbiddenException('No tiene permisos para modificar órdenes de otro puesto');
    }

    if (order.status === 'ENTREGADO' || order.status === 'CANCELADO') {
      throw new BadRequestException(`No se puede modificar una orden en estado terminal (${order.status})`);
    }

    const updated = order.updateInfo(dto);
    const saved = await this.serviceOrderRepository.save(updated);

    await this.auditLogPort.record({
      userId: user.id,
      action: 'SERVICE_ORDER_UPDATED',
      module: 'SERVICE_ORDERS',
      payload: {
        orderId: saved.id,
        orderCode: saved.code,
        customerName: saved.customerName,
        laborCost: saved.laborCost,
        partsTotal: saved.partsTotal,
        totalAmount: saved.totalAmount,
      },
      ipAddress,
    });

    return ServiceOrderDtoMapper.toDetailResponseDto(saved);
  }
}
