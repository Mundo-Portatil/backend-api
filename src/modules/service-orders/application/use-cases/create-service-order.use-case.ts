import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/ports/out/service-order-repository.port';
import type { ServiceOrderRepositoryPort } from '../../domain/ports/out/service-order-repository.port';
import { SERVICE_ORDER_CODE_GENERATOR } from '../../domain/ports/out/service-order-code-generator.port';
import type { ServiceOrderCodeGeneratorPort } from '../../domain/ports/out/service-order-code-generator.port';
import { LOCATION_REPOSITORY } from '../../../locations/domain/ports/out/location-repository.port';
import type { LocationRepositoryPort } from '../../../locations/domain/ports/out/location-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import { TechnicalServiceOrderEntity } from '../../domain/entities/technical-service-order.entity';
import type { CreateServiceOrderCommandDto } from '../dto/create-service-order-command.dto';
import type { ServiceOrderResponseDto } from '../dto/service-order-response.dto';
import { ServiceOrderDtoMapper } from '../mappers/service-order-dto.mapper';

@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly serviceOrderRepository: ServiceOrderRepositoryPort,
    @Inject(SERVICE_ORDER_CODE_GENERATOR)
    private readonly codeGenerator: ServiceOrderCodeGeneratorPort,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(dto: CreateServiceOrderCommandDto, ipAddress?: string): Promise<ServiceOrderResponseDto> {
    let targetLocationId: string;

    if (dto.userRole === 'TECNICO') {
      if (!dto.userLocationId) {
        throw new ForbiddenException('El técnico no tiene un puesto asignado');
      }
      if (dto.locationId && dto.locationId !== dto.userLocationId) {
        throw new ForbiddenException('El técnico solo puede registrar órdenes en su propio puesto asignado');
      }
      targetLocationId = dto.userLocationId;
    } else if (dto.userRole === 'ADMIN') {
      if (!dto.locationId) {
        throw new BadRequestException('El administrador debe especificar el locationId del puesto');
      }
      targetLocationId = dto.locationId;
    } else {
      throw new ForbiddenException('Rol no autorizado para crear órdenes de servicio');
    }

    const location = await this.locationRepository.findById(targetLocationId);
    if (!location || !location.active) {
      throw new NotFoundException('Puesto no encontrado o inactivo');
    }
    if (location.type !== 'PUESTO') {
      throw new BadRequestException('Solo se pueden registrar órdenes de servicio en puestos de atención');
    }

    const code = await this.codeGenerator.generateCode();

    const orderEntity = TechnicalServiceOrderEntity.create({
      code,
      locationId: targetLocationId,
      technicianId: dto.userId,
      customerName: dto.customerName,
      customerDocumentType: dto.customerDocumentType,
      customerDocument: dto.customerDocument,
      customerPhone: dto.customerPhone,
      customerAddress: dto.customerAddress,
      deviceBrand: dto.deviceBrand,
      deviceModel: dto.deviceModel,
      deviceSerial: dto.deviceSerial,
      deviceAccessories: dto.deviceAccessories,
      reportedIssue: dto.reportedIssue,
      technicalNotes: dto.technicalNotes,
      extractedPartsNotes: dto.extractedPartsNotes,
      laborCost: dto.laborCost,
      locationName: location.name,
      technicianName: dto.userName ?? null,
    });

    const savedOrder = await this.serviceOrderRepository.save(orderEntity);

    await this.auditLogPort.record({
      userId: dto.userId,
      action: 'SERVICE_ORDER_CREATED',
      module: 'SERVICE_ORDERS',
      payload: {
        orderId: savedOrder.id,
        orderCode: savedOrder.code,
        locationId: savedOrder.locationId,
        technicianId: savedOrder.technicianId,
        deviceBrand: savedOrder.deviceBrand,
        deviceModel: savedOrder.deviceModel,
        deviceSerial: savedOrder.deviceSerial,
        laborCost: savedOrder.laborCost,
      },
      ipAddress,
    });

    return ServiceOrderDtoMapper.toResponseDto(savedOrder);
  }
}
