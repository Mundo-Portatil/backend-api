import {
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderRepositoryPort } from '../../domain/ports/out/service-order-repository.port';
import type { QueryServiceOrdersDto } from '../dto/query-service-orders.dto';
import type { ServiceOrderListResponseDto } from '../dto/service-order-list-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class GetServiceOrdersUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
  ) {}

  async execute(dto: QueryServiceOrdersDto): Promise<ServiceOrderListResponseDto> {
    let effectiveLocationId: string | undefined;

    if (dto.userRole === 'TECNICO') {
      if (!dto.userLocationId) {
        throw new ForbiddenException('El técnico no tiene un puesto asignado');
      }
      effectiveLocationId = dto.userLocationId;
    } else if (dto.userRole === 'ADMIN') {
      effectiveLocationId = dto.locationId;
    } else {
      throw new ForbiddenException('Rol no autorizado para consultar órdenes de servicio');
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;

    const result = await this.serviceOrderRepository.findAll({
      locationId: effectiveLocationId,
      status: dto.status,
      search: dto.search,
      page,
      limit,
    });

    const data = result.orders.map((o) => ServiceOrderDtoMapper.toResponseDto(o));
    const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / limit);

    return {
      data,
      total: result.total,
      page,
      limit,
      totalPages,
      countsByStatus: result.countsByStatus,
    };
  }
}
