import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderRepositoryPort } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderDetailResponseDto } from '../dto/service-order-detail-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class GetServiceOrderDetailUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
  ) {}

  async execute(
    idOrCode: string,
    userRole: string,
    userLocationId?: string | null,
  ): Promise<ServiceOrderDetailResponseDto> {
    const order =
      (await this.serviceOrderRepository.findById(idOrCode)) ??
      (await this.serviceOrderRepository.findByCode(idOrCode));

    if (!order) {
      throw new NotFoundException('Orden de servicio técnico no encontrada');
    }

    if (userRole === 'TECNICO' && userLocationId !== order.locationId) {
      throw new ForbiddenException('No tiene permisos para consultar órdenes de otro puesto');
    }

    return ServiceOrderDtoMapper.toDetailResponseDto(order);
  }
}
